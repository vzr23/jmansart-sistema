'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validarAmbiente } = require('../config/env');
const { criarApp } = require('../app');
const { mapearImovelParaContrato } = require('../utils/dadosImovelContrato');

const BASE = { AUTH_USER: 'u', AUTH_PASS: 'p', AUTH_JWT_SECRET: 's', AUTH_EMAIL: 'a@exemplo.test', EMAIL_USER: 'e@exemplo.test', EMAIL_PASS: 'x' };

test('CORS_ORIGIN é obrigatório (ausente, vazio ou só espaços)', () => {
  for (const valor of [undefined, '', '   ']) {
    const r = validarAmbiente({ ...BASE, CORS_ORIGIN: valor });
    assert.equal(r.ok, false);
    assert.match(r.problemas.join(), /CORS_ORIGIN não definida/);
  }
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: 'https://jmansart-sistema.vercel.app' }).ok, true);
});

test('CORS_ORIGIN: "*" só fora de produção; barra final e caminho são recusados', () => {
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: '*' }).ok, true);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: '*', NODE_ENV: 'production' }).ok, false);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: '*', RAILWAY_ENVIRONMENT: 'production' }).ok, false);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: 'https://a.test/' }).ok, false);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: 'https://a.test/app' }).ok, false);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: 'a.test' }).ok, false);
  assert.equal(validarAmbiente({ ...BASE, CORS_ORIGIN: 'https://a.test, https://b.test', NODE_ENV: 'production' }).ok, true);
});

test('criarApp recusa montar sem CORS_ORIGIN', () => {
  assert.throws(() => criarApp({}), /CORS_ORIGIN é obrigatório/);
  assert.throws(() => criarApp({ corsOrigin: '  ' }), /CORS_ORIGIN é obrigatório/);
});

test('o server.js RECUSA INICIAR sem CORS_ORIGIN (processo termina com erro)', () => {
  // cwd num diretório temporário: o dotenv do server.js procura ".env" no cwd e não toca no .env do projeto.
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: os.tmpdir(),
    env: { PATH: process.env.PATH, ...BASE, PORT: '0' },
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /CORS_ORIGIN não definida/);
  assert.doesNotMatch(r.stdout, /Backend em/);
});

test('mapeamento da planilha: campos vazios viram texto vazio; tipo do imóvel vem de Subtipo ou Tipo', () => {
  const m = mapearImovelParaContrato({ 'ID': ' BC001 ', 'Tipo': 'Comercial', 'Subtipo': '', 'Valor': 'R$ 1,00' });
  assert.equal(m.id, 'BC001');
  assert.equal(m.imovel.tipo_imovel, 'comercial');
  assert.equal(m.proprietario.nome, '');
  assert.equal(m.tipo_vendedor, 'PF');
  assert.deepEqual(m.avisos, []);
});

test('cadastro antigo: endereço único do imóvel e do vendedor é separado, com aviso de conferência', () => {
  const m = mapearImovelParaContrato({
    'ID': 'BC009', 'Tipo': 'Residencial', 'Subtipo': 'Apartamento', 'Tipo Vendedor': 'PF',
    'Nome / Razão Social': 'Fulano Teste', 'Matrícula': '-',
    'Endereço Vendedor': 'Rua Exemplo, 100, Apto 10, Bairro Teste, Cidade Teste, SC, 89000-000',
    'Endereço Imóvel': 'Rua 999, 50, Apto 20, Centro', 'Cidade Imóvel': 'Cidade Teste', 'UF Imóvel': 'SC',
  });
  assert.equal(m.proprietario.rua, 'Rua Exemplo');
  assert.equal(m.proprietario.numero, '100, Apto 10');
  assert.equal(m.proprietario.bairro, 'Bairro Teste');
  assert.equal(m.proprietario.cidade, 'Cidade Teste');
  assert.equal(m.proprietario.uf, 'SC');
  assert.equal(m.proprietario.cep, '89000-000');
  assert.equal(m.imovel.logradouro_imovel, 'Rua 999, 50, Apto 20');
  assert.equal(m.imovel.bairro_imovel, 'Centro');
  assert.equal(m.imovel.matricula, '', 'traço sozinho na planilha significa "sem dado"');
  assert.deepEqual(m.avisos, ['Endereços do vendedor e do imóvel lidos do cadastro antigo (campo único). Confira rua, número, complemento e bairro.']);
});

test('cadastro antigo: com 3 partes, a terceira é bairro (ou complemento se começar com Apto/Casa/Bloco...)', () => {
  const a = mapearImovelParaContrato({ 'Endereço Imóvel': 'Rua A, 10, Centro' });
  assert.equal(a.imovel.logradouro_imovel, 'Rua A, 10');
  assert.equal(a.imovel.bairro_imovel, 'Centro');
  const b = mapearImovelParaContrato({ 'Endereço Imóvel': 'Rua A, 10, Apto 3' });
  assert.equal(b.imovel.logradouro_imovel, 'Rua A, 10, Apto 3');
  assert.equal(b.imovel.bairro_imovel, '');
  assert.equal(b.avisos.length, 1);
  assert.match(b.avisos[0], /^Endereço do imóvel lido/);
});

test('colunas detalhadas têm prioridade sobre o endereço único e não geram aviso', () => {
  const m = mapearImovelParaContrato({
    'Endereço Imóvel': 'Texto antigo, 1, Velho', 'Logradouro Imóvel': 'Rua Nova', 'Número Imóvel': '7', 'Bairro Imóvel': 'Novo',
    'Endereço Vendedor': 'Texto antigo, 1', 'Logradouro Vendedor': 'Av. Nova', 'Número Vendedor': '8', 'Bairro Vendedor': 'Bairro N',
  });
  assert.equal(m.imovel.logradouro_imovel, 'Rua Nova, 7');
  assert.equal(m.imovel.bairro_imovel, 'Novo');
  assert.equal(m.proprietario.rua, 'Av. Nova');
  assert.deepEqual(m.avisos, []);
});
