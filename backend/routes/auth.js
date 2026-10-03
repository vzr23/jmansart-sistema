'use strict';
const jwt = require('jsonwebtoken');
const SEG = require('../config/seguranca');
const { LimitadorTentativas } = require('../utils/limitador');
const { criarOtpStore, iguaisEmTempoConstante } = require('../utils/otpStore');
const { sendOtp } = require('../utils/mailer');

// Suporte a múltiplos usuários via AUTH_USERS (JSON array no Railway)
// Exemplo: [{"user":"vregis","pass":"senha1","email":"vregis@gmail.com"},{"user":"outro","pass":"senha2","email":"outro@gmail.com"}]
// Fallback: AUTH_USER / AUTH_PASS / OTP_EMAIL (usuário único, retrocompatível)
function getUsers() {
  if (process.env.AUTH_USERS) {
    try {
      return JSON.parse(process.env.AUTH_USERS);
    } catch {
      console.error('[auth] AUTH_USERS inválido — verifique o JSON no Railway');
    }
  }
  if (process.env.AUTH_USER && process.env.AUTH_PASS) {
    return [{ user: process.env.AUTH_USER, pass: process.env.AUTH_PASS, email: process.env.OTP_EMAIL }];
  }
  return [];
}

const normalizar = (v) => String(v ?? '').trim().toLowerCase().slice(0, 100);

// Compara sem vazar, pelo tempo, onde a diferença está (e sem curto-circuito entre usuário e senha).
function credenciaisConferem(u, user, password) {
  const a = iguaisEmTempoConstante(u.user, user ?? '');
  const b = iguaisEmTempoConstante(u.pass, password ?? '');
  return a && b;
}

/**
 * Fábrica das rotas de autenticação (injeção de dependências para teste).
 * Contadores e códigos ficam em memória: ver config/seguranca.js.
 */
function criarAuth({ enviarOtp = sendOtp, agora = Date.now, limites = SEG } = {}) {
  const novo = (cfg) => new LimitadorTentativas({ ...cfg, agora });
  const L = {
    loginUsuario: novo(limites.login.falhasPorUsuario),
    loginIp: novo(limites.login.falhasPorIp),
    otpUsuario: novo(limites.otp.falhasPorUsuario),
    otpIp: novo(limites.otp.falhasPorIp),
    emissaoUsuario: novo(limites.otp.emissaoPorUsuario),
    emissaoIp: novo(limites.otp.emissaoPorIp),
  };
  const otp = criarOtpStore({ agora, ttlMs: limites.otp.ttlMs, maxErros: limites.otp.maxErrosPorCodigo });

  const primeiroBloqueio = (...estados) => estados.find((e) => e.bloqueado);

  function responder429(res, estado) {
    const minutos = Math.max(1, Math.ceil(estado.retryAfterSeg / 60));
    res.set('Retry-After', String(estado.retryAfterSeg));
    return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${minutos} minuto(s).` });
  }

  // Conta uma falha; avisa no log (sem identificar usuário nem IP) quando um bloqueio começa.
  function registrarFalha(limitador, chave, rotulo) {
    const antes = limitador.consultar(chave).bloqueado;
    const depois = limitador.registrar(chave);
    if (!antes && depois.bloqueado) console.warn(`[auth] limite atingido: bloqueio temporário por ${rotulo}`);
  }

  async function login(req, res) {
    const { user, password } = req.body ?? {};
    const secret = process.env.AUTH_JWT_SECRET;

    if (!secret) {
      console.error('[auth] AUTH_JWT_SECRET não definida');
      return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
    }

    const ip = req.ip;
    const chaveUsuario = normalizar(user);
    const bloqueio = primeiroBloqueio(L.loginIp.consultar(ip), L.loginUsuario.consultar(chaveUsuario));
    if (bloqueio) return responder429(res, bloqueio);

    const users = getUsers();
    if (users.length === 0) {
      console.error('[auth] Nenhum usuário configurado');
      return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
    }

    const found = users.find((u) => credenciaisConferem(u, user, password));
    if (!found) {
      registrarFalha(L.loginIp, ip, 'IP (login)');
      registrarFalha(L.loginUsuario, chaveUsuario, 'usuário (login)');
      return res.status(401).json({ error: 'Usuário ou senha incorretos' });
    }

    if (!found.email) {
      // Usuário sem e-mail: login direto (sem 2FA)
      const token = jwt.sign({ user: found.user }, secret, { expiresIn: '30m' });
      return res.json({ token });
    }

    const bloqueioEmissao = primeiroBloqueio(L.emissaoUsuario.consultar(chaveUsuario), L.emissaoIp.consultar(ip));
    if (bloqueioEmissao) return responder429(res, bloqueioEmissao);
    registrarFalha(L.emissaoUsuario, chaveUsuario, 'pedidos de código (usuário)');
    registrarFalha(L.emissaoIp, ip, 'pedidos de código (IP)');

    try {
      const code = otp.salvar(chaveUsuario);
      await enviarOtp(found.email, code);
      return res.json({ requiresOtp: true });
    } catch (err) {
      console.error('[auth] Erro ao enviar OTP:', err?.name || 'Error');
      return res.status(500).json({ error: 'Falha ao enviar código de verificação' });
    }
  }

  async function verifyOtpRoute(req, res) {
    const { user, code } = req.body ?? {};
    const secret = process.env.AUTH_JWT_SECRET;

    if (!user || !code) {
      return res.status(400).json({ error: 'Usuário e código são obrigatórios' });
    }

    const ip = req.ip;
    const chaveUsuario = normalizar(user);
    // Bloqueado: recusa até o código correto (o atacante não descobre se acertou).
    const bloqueio = primeiroBloqueio(L.otpIp.consultar(ip), L.otpUsuario.consultar(chaveUsuario));
    if (bloqueio) return responder429(res, bloqueio);

    const canonico = getUsers().find((u) => normalizar(u.user) === chaveUsuario);
    const resultado = canonico ? otp.verificar(chaveUsuario, code) : { ok: false, motivo: 'sem_usuario' };

    if (!resultado.ok) {
      registrarFalha(L.otpIp, ip, 'IP (código)');
      registrarFalha(L.otpUsuario, chaveUsuario, 'usuário (código)');
      if (resultado.motivo === 'invalidado') {
        return res.status(401).json({ error: 'Código invalidado após muitas tentativas incorretas. Faça login novamente para receber um novo código.' });
      }
      return res.status(401).json({ error: 'Código inválido ou expirado' });
    }

    const token = jwt.sign({ user: canonico.user }, secret, { expiresIn: '30m' });
    return res.json({ token });
  }

  return { login, verifyOtpRoute };
}

module.exports = { criarAuth };
