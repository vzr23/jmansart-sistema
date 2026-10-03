'use strict';
/**
 * Monta o app Express (sem escutar porta), para o server.js e para os testes.
 * Ordem importa:
 *   CORS -> rotas públicas (/health, /auth, com corpo de 10kb) -> /contratos (JWT + limites + corpo de 32kb)
 *   -> parsers gerais (2mb) -> JWT global -> demais rotas.
 */
const express = require('express');
const cors = require('cors');

const SEG = require('./config/seguranca');
const { parseOrigens } = require('./config/env');
const authMiddleware = require('./middleware/auth');
const { criarAuth } = require('./routes/auth');
const { criarRotasContratos } = require('./routes/contratos');
const { createImovel, listImoveis, getCidadeSigla, deleteImovel, updateImovel } = require('./routes/imoveis');
const { createCliente, listClientes, deleteCliente, updateCliente } = require('./routes/clientes');
const { createMovimentacao, listMovimentacoes } = require('./routes/movimentacoes');

function criarApp({ corsOrigin, trustProxyHops = 1, limites = SEG, authDeps = {}, contratosDeps = {} } = {}) {
  const origens = parseOrigens(corsOrigin);
  if (origens.length === 0) {
    throw new Error('CORS_ORIGIN é obrigatório: informe a URL exata do frontend (o servidor não libera "*" por padrão)');
  }

  const app = express();
  app.disable('x-powered-by');
  // Atrás do proxy do Railway: req.ip = IP do cliente (1 salto confiável). Sem isto, todos teriam o IP do proxy.
  app.set('trust proxy', trustProxyHops);

  // ── CORS ──────────────────────────────────
  const corsOptions = {
    origin: origens.includes('*') ? '*' : origens,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'X-Registro-Movimentacao', 'Retry-After'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // Responde preflights OPTIONS

  // ── Rotas públicas (sem autenticação) ────
  const auth = criarAuth(authDeps);
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
  app.use('/auth', express.json({ limit: limites.limiteCorpoAuth }));
  app.post('/auth/login', auth.login);
  app.post('/auth/verify-otp', auth.verifyOtpRoute);

  // ── Contratos: nada de dado pessoal em cache; JWT e limites vêm ANTES do parser do corpo ──
  app.use('/contratos', (_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    next();
  });
  app.use('/contratos', criarRotasContratos({ authMiddleware, limites, ...contratosDeps }));

  // ── Parsers gerais (rotas legadas) ────────
  app.use(express.json({ limit: limites.limiteCorpoGeral }));
  app.use(express.urlencoded({ extended: true })); // limite padrão do Express (100kb), como antes

  // ── JWT: protege todas as rotas abaixo ───
  app.use(authMiddleware);

  // ── Imóveis ──────────────────────────────
  app.post('/imovel', createImovel);
  app.get('/imoveis', listImoveis);
  app.get('/imoveis/sigla', getCidadeSigla);
  app.put('/imovel/:id', updateImovel);
  app.delete('/imovel/:id', deleteImovel);

  // ── Clientes ─────────────────────────────
  app.post('/cliente', createCliente);
  app.get('/clientes', listClientes);
  app.put('/cliente/:id', updateCliente);
  app.delete('/cliente/:id', deleteCliente);

  // ── Movimentações ─────────────────────────
  app.post('/movimentacao', createMovimentacao);
  app.get('/movimentacoes', listMovimentacoes);

  // ── Erros ─────────────────────────────────
  app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
  app.use((err, req, res, _next) => {
    // Erros de corpo (grande demais, JSON inválido): resposta genérica; a mensagem do parser pode conter trecho do corpo.
    if (err && err.type && err.status >= 400 && err.status < 500) {
      const msg = err.type === 'entity.too.large' ? 'Corpo da requisição grande demais' : 'Requisição inválida';
      return res.status(err.status).json({ error: msg });
    }
    // Rotas com dados pessoais: log sem mensagem nem stack (podem conter trechos dos dados).
    const sensivel = /^\/(contratos|auth)(\/|$)/.test(req.path);
    if (sensivel) console.error(`[erro] ${err?.name || 'Error'} em ${req.method} ${req.path.split('/').slice(0, 3).join('/')}`);
    else console.error(err);
    res.status(500).json({ error: sensivel ? 'Erro interno' : (err.message || 'Erro interno') });
  });

  return app;
}

module.exports = { criarApp };
