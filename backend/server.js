require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { createImovel, listImoveis, getCidadeSigla, deleteImovel } = require('./routes/imoveis');
const { createCliente, listClientes, deleteCliente } = require('./routes/clientes');
const { createMovimentacao, listMovimentacoes } = require('./routes/movimentacoes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares ──────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Autenticação básica ──────────────────
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="J.Mansart"');
    return res.status(401).send('Acesso restrito');
  }
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  const validUser = process.env.AUTH_USER || 'jmansart';
  const validPass = process.env.AUTH_PASS || 'mansart2026';
  if (user !== validUser || pass !== validPass) {
    res.set('WWW-Authenticate', 'Basic realm="J.Mansart"');
    return res.status(401).send('Usuário ou senha incorretos');
  }
  next();
});

// ── Rotas ────────────────────────────────
app.post('/imovel',         createImovel);      // Salvar imóvel
app.get('/imoveis',         listImoveis);       // Listar imóveis
app.get('/imoveis/sigla',   getCidadeSigla);    // Sugerir sigla por cidade
app.delete('/imovel/:id',   deleteImovel);      // Remover imóvel

app.post('/cliente',        createCliente);     // Salvar cliente
app.get('/clientes',        listClientes);      // Listar clientes
app.delete('/cliente/:id',  deleteCliente);     // Remover cliente

app.post('/movimentacao',   createMovimentacao);  // Registrar movimentação
app.get('/movimentacoes',   listMovimentacoes);   // Listar movimentações (filtro ?ref=ID)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`\n🏠  J.Mansart Backend em http://localhost:${PORT}\n`);
});
