'use strict';
// Tipo de cliente (Vendedor/Comprador/Ambos) e vínculo imóvel → cliente. Tudo FICTÍCIO; a planilha é simulada em memória.
const test = require('node:test');
const assert = require('node:assert/strict');

const sheets = require('../sheets');
const gravadas = [];
let linhasClientes = [];
sheets.appendRow = async (aba, linha) => { gravadas.push({ aba, linha }); };
sheets.getColumnA = async () => [];
sheets.getRows = async (aba) => (aba === sheets.CLIENTES_SHEET ? linhasClientes : []);

const { createCliente, listClientes, normalizarTipoCliente, tiposQueIncluem } = require('../routes/clientes');
const { createImovel } = require('../routes/imoveis');

function resposta() {
  const r = { codigo: 200, corpo: null };
  r.status = (c) => { r.codigo = c; return r; };
  r.json = (b) => { r.corpo = b; return r; };
  return r;
}

test('colunas novas ficam no fim das abas (o que já existe não muda de lugar)', () => {
  assert.equal(sheets.CLIENTES_HEADERS.length, 31);
  assert.equal(sheets.CLIENTES_HEADERS[23], 'Tipo de Cliente');
  assert.equal(sheets.CLIENTES_HEADERS[22], 'Bairro');
  assert.equal(sheets.IMOVEIS_HEADERS.length, 46);
  assert.equal(sheets.IMOVEIS_HEADERS[39], 'ID Cliente Vendedor');
  assert.equal(sheets.IMOVEIS_HEADERS[38], 'Bairro Imóvel');
});

test('normalizarTipoCliente aceita só Vendedor, Comprador e Ambos', () => {
  assert.equal(normalizarTipoCliente(' Vendedor '), 'Vendedor');
  assert.equal(normalizarTipoCliente('Comprador'), 'Comprador');
  assert.equal(normalizarTipoCliente('Ambos'), 'Ambos');
  assert.equal(normalizarTipoCliente('vendedor'), '');
  assert.equal(normalizarTipoCliente('Outro'), '');
  assert.equal(normalizarTipoCliente(undefined), '');
  assert.deepEqual(tiposQueIncluem('Vendedor'), ['Vendedor', 'Ambos']);
  assert.deepEqual(tiposQueIncluem('Comprador'), ['Comprador', 'Ambos']);
  assert.deepEqual(tiposQueIncluem('Ambos'), ['Ambos']);
});

test('createCliente grava o tipo na última coluna e a linha tem uma célula por cabeçalho', async () => {
  gravadas.length = 0;
  const res = resposta();
  await createCliente({ body: { dadosPessoais: { nome: 'Fulano Teste', cpf: '529.982.247-25', tipoCliente: 'Ambos', endereco: { logradouro: 'Rua Exemplo', numero: '10' } } } }, res);
  assert.equal(res.codigo, 201);
  const { aba, linha } = gravadas[0];
  assert.equal(aba, sheets.CLIENTES_SHEET);
  assert.equal(linha.length, sheets.CLIENTES_HEADERS.length);
  assert.equal(linha[23], 'Ambos');
  assert.equal(linha[2], 'Fulano Teste');

  gravadas.length = 0;
  await createCliente({ body: { dadosPessoais: { nome: 'Sicrano Teste', tipoCliente: 'qualquer coisa' } } }, resposta());
  assert.equal(gravadas[0].linha[23], '', 'valor inválido vira vazio');
});

test('listClientes?tipo=Vendedor traz Vendedor e Ambos; sem tipo traz todos; a busca por nome continua valendo', async () => {
  linhasClientes = [
    { 'ID': 'CLI001', 'Nome': 'Ana Teste', 'CPF': '1', 'Tipo de Cliente': 'Vendedor' },
    { 'ID': 'CLI002', 'Nome': 'Bruno Teste', 'CPF': '2', 'Tipo de Cliente': 'Comprador' },
    { 'ID': 'CLI003', 'Nome': 'Carla Teste', 'CPF': '3', 'Tipo de Cliente': 'Ambos' },
    { 'ID': 'CLI004', 'Nome': 'Davi Antigo', 'CPF': '4', 'Tipo de Cliente': '' },
  ];
  const ids = async (query) => { const r = resposta(); await listClientes({ query }, r); return r.corpo.data.map((c) => c['ID']); };
  assert.deepEqual(await ids({ tipo: 'Vendedor' }), ['CLI001', 'CLI003']);
  assert.deepEqual(await ids({ tipo: 'Comprador' }), ['CLI002', 'CLI003']);
  assert.deepEqual(await ids({ tipo: 'Ambos' }), ['CLI003']);
  assert.deepEqual(await ids({}), ['CLI001', 'CLI002', 'CLI003', 'CLI004']);
  assert.deepEqual(await ids({ tipo: 'Vendedor', q: 'carla' }), ['CLI003']);
  assert.deepEqual(await ids({ tipo: 'Vendedor', q: 'bruno' }), []);
  assert.deepEqual(await ids({ tipo: 'invalido' }), ['CLI001', 'CLI002', 'CLI003', 'CLI004'], 'tipo inválido é ignorado');
});

test('createImovel guarda o ID do cliente só para PF e só no formato CLI000', async () => {
  const corpo = (vendedor) => ({ body: { tipoImovel: { tipo: 'Residencial', subtipos: ['Apartamento'] }, vendedor, imovel: { cidade: 'Blumenau', cidadeAbrev: 'BL' } } });

  gravadas.length = 0;
  await createImovel(corpo({ tipoVendedor: 'PF', nome: 'Ana Teste', idCliente: 'CLI007' }), resposta());
  assert.equal(gravadas[0].linha.length, sheets.IMOVEIS_HEADERS.length);
  assert.equal(gravadas[0].linha[39], 'CLI007');

  gravadas.length = 0;
  await createImovel(corpo({ tipoVendedor: 'PJ', razaoSocial: 'Empresa Teste', idCliente: 'CLI007' }), resposta());
  assert.equal(gravadas[0].linha[39], '', 'vendedor PJ não guarda vínculo');

  gravadas.length = 0;
  await createImovel(corpo({ tipoVendedor: 'PF', nome: 'Ana Teste', idCliente: '=HYPERLINK("x")' }), resposta());
  assert.equal(gravadas[0].linha[39], '', 'qualquer coisa fora do formato CLI000 é descartada');
});
