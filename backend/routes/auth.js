const jwt      = require('jsonwebtoken');
const { saveOtp, verifyOtp } = require('../utils/otpStore');
const { sendOtp }            = require('../utils/mailer');

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

async function login(req, res) {
  const { user, password } = req.body ?? {};
  const secret = process.env.AUTH_JWT_SECRET;

  if (!secret) {
    console.error('[auth] AUTH_JWT_SECRET não definida');
    return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
  }

  const users = getUsers();
  if (users.length === 0) {
    console.error('[auth] Nenhum usuário configurado');
    return res.status(500).json({ error: 'Configuração de autenticação ausente no servidor' });
  }

  const found = users.find((u) => u.user === user && u.pass === password);
  if (!found) {
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  }

  if (!found.email) {
    // Usuário sem e-mail: login direto (sem 2FA)
    const token = jwt.sign({ user }, secret, { expiresIn: '30m' });
    return res.json({ token });
  }

  try {
    const code = saveOtp(user);
    await sendOtp(found.email, code);
    return res.json({ requiresOtp: true });
  } catch (err) {
    console.error('[auth] Erro ao enviar OTP:', err);
    return res.status(500).json({ error: 'Falha ao enviar código de verificação' });
  }
}

async function verifyOtpRoute(req, res) {
  const { user, code } = req.body ?? {};
  const secret = process.env.AUTH_JWT_SECRET;

  if (!user || !code) {
    return res.status(400).json({ error: 'Usuário e código são obrigatórios' });
  }

  if (!verifyOtp(user, code)) {
    return res.status(401).json({ error: 'Código inválido ou expirado' });
  }

  const token = jwt.sign({ user }, secret, { expiresIn: '30m' });
  return res.json({ token });
}

module.exports = { login, verifyOtpRoute };
