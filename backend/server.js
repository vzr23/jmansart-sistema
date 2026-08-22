require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { login, verifyOtpRoute }  = require('./routes/auth');
const authMiddleware             = require('./middleware/auth');
const { createImovel, listImoveis, getCidadeSigla, deleteImovel, updateImovel } = require('./routes/imoveis');
const { createCliente, listClientes, deleteCliente, updateCliente }              = require('./routes/clientes');
const { createMovimentacao, listMovimentacoes }                   = require('./routes/movimentacoes');

// ── Validação de Variáveis de Ambiente ───
const requiredEnvVars = [
  'AUTH_USER',
  'AUTH_PASS',
  'AUTH_JWT_SECRET',
  'AUTH_EMAIL',
  'EMAIL_USER',
  'EMAIL_PASS',
];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`\n❌ ERRO: Variáveis de ambiente obrigatórias não definidas:\n   ${missing.join(', ')}\n`);
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globais ───────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rotas públicas (sem autenticação) ────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.post('/auth/login',      login);
app.post('/auth/verify-otp', verifyOtpRoute);

// ── JWT: protege todas as rotas abaixo ───
app.use(authMiddleware);

// ── Imóveis ──────────────────────────────
app.post('/imovel',        createImovel);
app.get('/imoveis',        listImoveis);
app.get('/imoveis/sigla',  getCidadeSigla);
app.put('/imovel/:id',     updateImovel);
app.delete('/imovel/:id',  deleteImovel);

// ── Clientes ─────────────────────────────
app.post('/cliente',       createCliente);
app.get('/clientes',       listClientes);
app.put('/cliente/:id',    updateCliente);
app.delete('/cliente/:id', deleteCliente);

// ── Movimentações ─────────────────────────
app.post('/movimentacao',  createMovimentacao);
app.get('/movimentacoes',  listMovimentacoes);

// ── Erros ─────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`\n🏠  J.Mansart Backend em http://localhost:${PORT}\n`);
});
