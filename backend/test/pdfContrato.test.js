'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gerarPdfContrato, marcaMinutaAtiva } = require('../utils/pdfContrato');
const { gerarTextoAutorizacaoVenda } = require('../utils/contratoAutorizacao');

const P = { nome: 'Maria Teste', genero: 'F', nacionalidade: 'brasileira', profissao: 'empresária', estado_civil: 'solteira', cpf: '529.982.247-25', rua: 'Rua Exemplo', numero: '1', bairro: 'Centro', cidade: 'Blumenau', uf: 'SC', cep: '89000-000' };
const base = (n) => ({
  proprietarios: Array(n).fill(P),
  imovel: { matricula: '1', comarca: 'Blumenau', tipo_imovel: 'casa', area_m2: '300', logradouro_imovel: 'Rua X, 1', bairro_imovel: 'Centro', municipio_imovel: 'Blumenau', uf_imovel: 'SC' },
  condicoes: { valor: '500000', cidade_assinatura: 'Blumenau', data_assinatura: '2026-09-17' },
});
const paginas = (buf) => (buf.toString('latin1').match(/\/Type \/Page(?!s)/g) || []).length;

test('gera PDF válido em memória (Buffer), com 1 e com 5 proprietários', async () => {
  for (const n of [1, 5]) {
    const { texto } = gerarTextoAutorizacaoVenda(base(n));
    const pdf = await gerarPdfContrato(texto, { minuta: false });
    assert.ok(Buffer.isBuffer(pdf));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.match(pdf.subarray(-8).toString('latin1'), /%%EOF/);
    assert.ok(paginas(pdf) >= 2, `n=${n}: esperado >= 2 páginas, veio ${paginas(pdf)}`);
  }
});

test('marca MINUTA: desligada por padrão; ligada com CONTRATO_MARCA_MINUTA=true', async () => {
  const guardado = process.env.CONTRATO_MARCA_MINUTA;
  try {
    delete process.env.CONTRATO_MARCA_MINUTA;
    assert.equal(marcaMinutaAtiva(), false);
    process.env.CONTRATO_MARCA_MINUTA = 'true';
    assert.equal(marcaMinutaAtiva(), true);
    process.env.CONTRATO_MARCA_MINUTA = ' TRUE ';
    assert.equal(marcaMinutaAtiva(), true);
    process.env.CONTRATO_MARCA_MINUTA = 'false';
    assert.equal(marcaMinutaAtiva(), false);

    const { texto } = gerarTextoAutorizacaoVenda(base(1));
    delete process.env.CONTRATO_MARCA_MINUTA;
    const semMarca = await gerarPdfContrato(texto); // segue o ambiente (false)
    process.env.CONTRATO_MARCA_MINUTA = 'true';
    const comMarca = await gerarPdfContrato(texto);
    assert.ok(comMarca.length > semMarca.length, 'o PDF com marca deve ser maior que o sem marca');
  } finally {
    if (guardado === undefined) delete process.env.CONTRATO_MARCA_MINUTA; else process.env.CONTRATO_MARCA_MINUTA = guardado;
  }
});

test('rodapé: sem frase "MINUTA sujeita a revisão jurídica" em ambos os casos', async () => {
  const guardado = process.env.CONTRATO_MARCA_MINUTA;
  try {
    const { texto } = gerarTextoAutorizacaoVenda(base(1));

    delete process.env.CONTRATO_MARCA_MINUTA;
    const semMarca = await gerarPdfContrato(texto);
    assert.doesNotMatch(semMarca.toString('latin1'), /MINUTA sujeita a revisão jurídica/);

    process.env.CONTRATO_MARCA_MINUTA = 'true';
    const comMarca = await gerarPdfContrato(texto);
    assert.doesNotMatch(comMarca.toString('latin1'), /MINUTA sujeita a revisão jurídica/);
  } finally {
    if (guardado === undefined) delete process.env.CONTRATO_MARCA_MINUTA; else process.env.CONTRATO_MARCA_MINUTA = guardado;
  }
});
