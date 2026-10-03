'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, req, capturarConsole, jwt } = require('./helpers');

const MIN = 60_000;
const USUARIOS = [
  { user: 'teste', pass: 'senha-de-teste-1', email: 'teste@exemplo.test' },
  { user: 'outro', pass: 'senha-de-teste-2', email: 'outro@exemplo.test' },
];

// Cenário: servidor com relógio falso e "e-mail" falso (guarda o último código enviado).
async function cenario() {
  process.env.AUTH_USERS = JSON.stringify(USUARIOS);
  let t = Date.now();
  const emails = [];
  const srv = await iniciar({ authDeps: { agora: () => t, enviarOtp: async (para, codigo) => { emails.push({ para, codigo }); } } });
  const ctx = {
    ...srv, emails,
    avancar: (ms) => { t += ms; },
    ultimoCodigo: () => emails[emails.length - 1].codigo,
    login: (ip, user = 'teste', password = 'senha-de-teste-1') => req(srv.base, 'POST', '/auth/login', { corpo: { user, password }, ip }),
    verificar: (ip, code, user = 'teste') => req(srv.base, 'POST', '/auth/verify-otp', { corpo: { user, code }, ip }),
    errado: () => { const c = emails[emails.length - 1].codigo; return c === '111111' ? '222222' : '111111'; },
  };
  return ctx;
}

test('fluxo normal: login -> código por e-mail -> token JWT do usuário', async () => {
  const c = await cenario();
  try {
    const l = await c.login('203.0.113.1');
    assert.equal(l.status, 200);
    assert.equal(l.json.requiresOtp, true);
    assert.equal(c.emails.length, 1);
    assert.equal(c.emails[0].para, 'teste@exemplo.test');
    assert.match(c.ultimoCodigo(), /^\d{6}$/);
    const v = await c.verificar('203.0.113.1', c.ultimoCodigo());
    assert.equal(v.status, 200);
    assert.equal(jwt.verify(v.json.token, process.env.AUTH_JWT_SECRET).user, 'teste');
    assert.equal((await c.verificar('203.0.113.1', c.ultimoCodigo())).status, 401, 'código de uso único');
  } finally { await c.fechar(); }
});

test('senha errada: 401 genérico; o login com senha certa continua funcionando abaixo do limite', async () => {
  const c = await cenario();
  try {
    const r = await c.login('203.0.113.2', 'teste', 'errada');
    assert.equal(r.status, 401);
    assert.equal(r.json.error, 'Usuário ou senha incorretos');
    assert.equal((await c.login('203.0.113.2')).status, 200);
  } finally { await c.fechar(); }
});

test('o código é invalidado após 5 erros — o código correto digitado depois também é recusado', async () => {
  const c = await cenario();
  try {
    await c.login('203.0.113.3');
    const certo = c.ultimoCodigo();
    const ruim = c.errado();
    for (let i = 1; i <= 4; i++) {
      const r = await c.verificar('203.0.113.3', ruim);
      assert.equal(r.status, 401);
      assert.match(r.json.error, /inválido ou expirado/);
    }
    const quinto = await c.verificar('203.0.113.3', ruim);
    assert.equal(quinto.status, 401);
    assert.match(quinto.json.error, /invalidado/);
    assert.equal((await c.verificar('203.0.113.3', certo)).status, 401, 'código certo, mas já invalidado');
  } finally { await c.fechar(); }
});

test('pedir um novo código NÃO zera o contador por usuário: 10 erros em 2 códigos bloqueiam o usuário', async () => {
  const c = await cenario();
  try {
    for (let rodada = 0; rodada < 2; rodada++) {
      await c.login('203.0.113.4');
      for (let i = 0; i < 5; i++) await c.verificar('203.0.113.4', c.errado());
    }
    await c.login('203.0.113.4'); // 3º código (pedir código ainda é permitido)
    const r = await c.verificar('203.0.113.4', c.ultimoCodigo()); // até o certo é recusado
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    // outro IP, mesmo usuário: continua bloqueado (limite é por usuário)
    assert.equal((await c.verificar('198.51.100.9', c.ultimoCodigo())).status, 429);
    // outro usuário não é afetado
    await c.login('203.0.113.4', 'outro', 'senha-de-teste-2');
    assert.equal((await c.verificar('203.0.113.4', c.ultimoCodigo(), 'outro')).status, 200);
  } finally { await c.fechar(); }
});

test('limite por IP: 20 erros (mesmo com usuários diferentes) bloqueiam o IP; outro IP segue livre', async () => {
  const c = await cenario();
  try {
    for (let i = 0; i < 20; i++) assert.equal((await c.verificar('203.0.113.5', '000000', `fantasma${i}`)).status, 401);
    await c.login('198.51.100.5');
    const certo = c.ultimoCodigo();
    const bloqueado = await c.verificar('203.0.113.5', certo);
    assert.equal(bloqueado.status, 429);
    assert.ok(Number(bloqueado.headers.get('retry-after')) > 0);
    assert.equal((await c.verificar('198.51.100.5', certo)).status, 200, 'IP diferente não é afetado');
  } finally { await c.fechar(); }
});

test('o bloqueio expira com o tempo e os contadores decaem', async () => {
  const c = await cenario();
  try {
    for (let rodada = 0; rodada < 2; rodada++) {
      await c.login('203.0.113.6');
      for (let i = 0; i < 5; i++) await c.verificar('203.0.113.6', c.errado());
    }
    await c.login('203.0.113.6');
    assert.equal((await c.verificar('203.0.113.6', c.ultimoCodigo())).status, 429);
    c.avancar(16 * MIN); // passou o bloqueio de 15 min (e o código antigo expirou)
    await c.login('203.0.113.6');
    assert.equal((await c.verificar('203.0.113.6', c.ultimoCodigo())).status, 200);
  } finally { await c.fechar(); }
});

test('login: 10 senhas erradas bloqueiam o IP (até a senha certa é recusada) e o usuário', async () => {
  const c = await cenario();
  try {
    for (let i = 0; i < 10; i++) assert.equal((await c.login('203.0.113.7', 'teste', `errada${i}`)).status, 401);
    const r = await c.login('203.0.113.7');
    assert.equal(r.status, 429);
    assert.equal(c.emails.length, 0, 'nenhum e-mail enviado durante o bloqueio');
    // outro IP, mesmo usuário: o limite por usuário também vale
    assert.equal((await c.login('198.51.100.7')).status, 429);
    // outro usuário e outro IP: livre
    assert.equal((await c.login('198.51.100.7', 'outro', 'senha-de-teste-2')).status, 200);
  } finally { await c.fechar(); }
});

test('pedidos de código: no máximo 5 por usuário em 15 min (evita enchente de e-mails)', async () => {
  const c = await cenario();
  try {
    for (let i = 0; i < 5; i++) assert.equal((await c.login(`203.0.113.${10 + i}`)).status, 200); // IPs diferentes
    const r = await c.login('203.0.113.99');
    assert.equal(r.status, 429);
    assert.equal(c.emails.length, 5);
  } finally { await c.fechar(); }
});

test('logs de bloqueio não trazem IP, usuário nem código', async () => {
  const c = await cenario();
  const cap = capturarConsole();
  try {
    for (let i = 0; i < 10; i++) await c.login('203.0.113.55', 'teste', `errada-${i}`);
    await c.login('203.0.113.56', 'outro', 'senha-de-teste-2');
    for (let i = 0; i < 5; i++) await c.verificar('203.0.113.56', c.errado(), 'outro');
    const log = cap.linhas.join('\n');
    assert.match(log, /limite atingido: bloqueio temporário/);
    for (const proibido of ['203.0.113', 'teste', 'outro', 'errada-', 'senha-de-teste', 'exemplo.test', c.ultimoCodigo()]) {
      assert.ok(!log.includes(proibido), `log contém "${proibido}"`);
    }
  } finally { cap.restaurar(); await c.fechar(); }
});

test('rotas de autenticação limitam o corpo a 10kb', async () => {
  const c = await cenario();
  try {
    const r = await req(c.base, 'POST', '/auth/login', { corpo: { user: 'x', password: 'y'.repeat(20 * 1024) } });
    assert.equal(r.status, 413);
    assert.equal(r.json.error, 'Corpo da requisição grande demais');
  } finally { await c.fechar(); }
});

test('IP vem do proxy (X-Forwarded-For, 1 salto): IPs diferentes têm contadores diferentes', async () => {
  const c = await cenario();
  try {
    for (let i = 0; i < 10; i++) await c.login('203.0.113.77', 'fantasma', 'x');
    assert.equal((await c.login('203.0.113.77', 'outro', 'senha-de-teste-2')).status, 429);
    assert.equal((await c.login('203.0.113.78', 'outro', 'senha-de-teste-2')).status, 200);
  } finally { await c.fechar(); }
});
