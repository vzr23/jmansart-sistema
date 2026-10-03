'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { LimitadorTentativas } = require('../utils/limitador');
const { criarOtpStore } = require('../utils/otpStore');

const relogio = (t0 = 1_000_000) => { let t = t0; return { agora: () => t, avancar: (ms) => { t += ms; } }; };
const MIN = 60_000;

test('bloqueia ao atingir o máximo e informa Retry-After', () => {
  const r = relogio();
  const l = new LimitadorTentativas({ max: 3, janelaMs: 10 * MIN, bloqueioMs: 15 * MIN, agora: r.agora });
  assert.equal(l.consultar('a').bloqueado, false);
  assert.equal(l.registrar('a').bloqueado, false);
  assert.equal(l.registrar('a').bloqueado, false);
  const st = l.registrar('a'); // 3ª ocorrência
  assert.equal(st.bloqueado, true);
  assert.equal(st.retryAfterSeg, 15 * 60);
  r.avancar(5 * MIN);
  assert.equal(l.consultar('a').retryAfterSeg, 10 * 60);
  assert.equal(l.consultar('b').bloqueado, false, 'chaves são independentes');
});

test('o bloqueio termina e o contador decai quando a janela passa', () => {
  const r = relogio();
  const l = new LimitadorTentativas({ max: 2, janelaMs: 10 * MIN, bloqueioMs: 15 * MIN, agora: r.agora });
  l.registrar('a'); l.registrar('a');
  assert.equal(l.consultar('a').bloqueado, true);
  r.avancar(15 * MIN + 1);
  assert.equal(l.consultar('a').bloqueado, false);
  assert.equal(l.registrar('a').bloqueado, false, 'nova janela recomeça do zero');
});

test('sem bloqueioMs: bloqueia até o fim da janela (uso como limite de requisições)', () => {
  const r = relogio();
  const l = new LimitadorTentativas({ max: 3, janelaMs: 10 * MIN, agora: r.agora });
  r.avancar(2 * MIN); l.registrar('u');
  r.avancar(1 * MIN); l.registrar('u');
  r.avancar(1 * MIN); const st = l.registrar('u');
  assert.equal(st.bloqueado, true);
  assert.equal(st.retryAfterSeg, 8 * 60); // a janela começou no 1º evento (há 2 min): faltam 8
  r.avancar(8 * MIN);
  assert.equal(l.consultar('u').bloqueado, false);
});

test('um bloqueio ativo sobrevive à troca de janela', () => {
  const r = relogio();
  const l = new LimitadorTentativas({ max: 2, janelaMs: 1 * MIN, bloqueioMs: 30 * MIN, agora: r.agora });
  l.registrar('a'); l.registrar('a');
  r.avancar(2 * MIN); // a janela acabou, o bloqueio (30 min) não
  assert.equal(l.consultar('a').bloqueado, true);
  l.registrar('a'); // nova janela não apaga o bloqueio
  assert.equal(l.consultar('a').bloqueado, true);
});

test('limita o uso de memória (poda entradas vencidas e depois as mais antigas)', () => {
  const r = relogio();
  const l = new LimitadorTentativas({ max: 5, janelaMs: MIN, agora: r.agora, maxChaves: 100 });
  for (let i = 0; i < 80; i++) l.registrar(`k${i}`);
  r.avancar(2 * MIN);
  for (let i = 0; i < 40; i++) l.registrar(`n${i}`); // passa de 100: as vencidas saem
  assert.ok(l.tamanho <= 100);
  for (let i = 0; i < 500; i++) l.registrar(`x${i}`); // todas vigentes: descarta as mais antigas
  assert.ok(l.tamanho <= 100, `tamanho ${l.tamanho}`);
});

test('configuração inválida é recusada', () => {
  assert.throws(() => new LimitadorTentativas({ max: 0, janelaMs: 1 }), RangeError);
  assert.throws(() => new LimitadorTentativas({ max: 1, janelaMs: 0 }), RangeError);
});

test('OTP: 6 dígitos, uso único, expira e é invalidado após 5 erros (mesmo que depois digite o certo)', () => {
  const r = relogio();
  const s = criarOtpStore({ agora: r.agora, ttlMs: 5 * MIN, maxErros: 5 });
  for (let i = 0; i < 300; i++) assert.match(s.salvar('u'), /^[1-9]\d{5}$/);

  let c = s.salvar('u');
  assert.deepEqual(s.verificar('u', c), { ok: true });
  assert.equal(s.verificar('u', c).ok, false, 'uso único');

  c = s.salvar('u');
  const errado = c === '123456' ? '654321' : '123456';
  for (let i = 1; i <= 4; i++) assert.equal(s.verificar('u', errado).motivo, 'incorreto');
  assert.equal(s.verificar('u', errado).motivo, 'invalidado'); // 5º erro
  assert.equal(s.verificar('u', c).ok, false, 'o código correto não vale mais');

  c = s.salvar('u');
  r.avancar(5 * MIN + 1);
  assert.equal(s.verificar('u', c).motivo, 'expirado');
  assert.equal(s.verificar('semcodigo', '111111').motivo, 'sem_codigo');
});

test('OTP: novo código zera só os erros do CÓDIGO (os limites por usuário/IP ficam no limitador)', () => {
  const s = criarOtpStore({ maxErros: 5 });
  let c = s.salvar('u');
  const errado = c === '123456' ? '654321' : '123456';
  for (let i = 0; i < 4; i++) s.verificar('u', errado);
  c = s.salvar('u'); // novo código: contagem do código recomeça
  assert.equal(s.verificar('u', errado).motivo, 'incorreto');
  assert.equal(s.verificar('u', c).ok, true);
});
