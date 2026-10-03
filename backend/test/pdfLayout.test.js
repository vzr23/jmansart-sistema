'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gerarPdfContrato } = require('../utils/pdfContrato');
const { gerarTextoAutorizacaoVenda } = require('../utils/contratoAutorizacao');

// Dados FICTÍCIOS.
const P = (i) => ({ nome: `Proprietário Fictício Número ${i}`, genero: i % 2 ? 'M' : 'F', nacionalidade: 'brasileiro(a)', profissao: 'profissão de teste', estado_civil: 'casado(a) com ambos os demais', cpf: '529.982.247-25', rua: 'Rua Exemplo', numero: String(i), bairro: 'Centro', cidade: 'Blumenau', uf: 'SC', cep: '89000-000' });
const entrada = (n, extra = 0) => ({
  proprietarios: Array.from({ length: n }, (_, i) => P(i + 1)),
  imovel: { matricula: '1', comarca: 'Blumenau', tipo_imovel: 'casa', area_m2: '300', logradouro_imovel: 'Rua Exemplo, 1' + ' complemento'.repeat(extra), bairro_imovel: 'Centro', municipio_imovel: 'Blumenau', uf_imovel: 'SC' },
  condicoes: { valor: '500000', cidade_assinatura: 'Blumenau', data_assinatura: '2026-09-17' },
});
async function gerar(n, extra) {
  const { texto } = gerarTextoAutorizacaoVenda(entrada(n, extra));
  const relatorio = {};
  const pdf = await gerarPdfContrato(texto, { minuta: true, relatorio });
  return { pdf, relatorio, texto };
}

test('fonte Liberation Serif embutida; nenhuma fonte padrão não embutida', async () => {
  const { pdf } = await gerar(2);
  const bruto = pdf.toString('latin1');
  assert.match(bruto, /\+LiberationSerif\b/);
  assert.match(bruto, /LiberationSerif-Bold/);
  assert.match(bruto, /\/FontFile2/);
  assert.doesNotMatch(bruto, /\/BaseFont \/Times/);
  assert.doesNotMatch(bruto, /\/BaseFont \/Helvetica/);
});

test('bloco de assinatura NUNCA é dividido entre páginas (1 a 10 proprietários x vários tamanhos de texto)', async () => {
  let combinacoes = 0;
  for (let n = 1; n <= 10; n++) {
    for (let extra = 0; extra <= 60; extra += 3) {
      const { relatorio } = await gerar(n, extra);
      assert.equal(relatorio.assinaturas.length, n + 1, `n=${n} extra=${extra}: esperado ${n + 1} blocos`);
      for (const [i, a] of relatorio.assinaturas.entries()) {
        assert.equal(a.paginaInicio, a.paginaFim, `bloco ${i + 1} dividido (n=${n}, extra=${extra})`);
      }
      combinacoes++;
    }
  }
  assert.ok(combinacoes >= 200);
});

test('fecho (data + assinaturas + compromisso) fica junto numa página quando cabe', async () => {
  for (let n = 1; n <= 4; n++) {
    for (let extra = 0; extra <= 60; extra += 3) {
      const { relatorio } = await gerar(n, extra);
      assert.equal(relatorio.fecho.paginaInicio, relatorio.fecho.paginaFim, `fecho dividido (n=${n}, extra=${extra})`);
      for (const a of relatorio.assinaturas) assert.equal(a.paginaInicio, relatorio.fecho.paginaInicio);
    }
  }
});

test('com muitos proprietários o fecho pode ocupar mais de uma página, mas só quebra ENTRE blocos', async () => {
  const { relatorio } = await gerar(10, 0);
  assert.ok(relatorio.paginas >= 2);
  assert.ok(relatorio.fecho.paginaFim >= relatorio.fecho.paginaInicio);
  for (const a of relatorio.assinaturas) assert.equal(a.paginaInicio, a.paginaFim);
});

test('CRECI/SC consistente: nunca "CRECI-SC" e toda menção segue o padrão do modelo', async () => {
  const { texto } = await gerar(2);
  assert.doesNotMatch(texto, /CRECI-SC/);
  const mencoes = texto.match(/CRECI\S*\s\S+/g);
  assert.ok(mencoes.length >= 2);
  for (const m of mencoes) assert.match(m, /^CRECI\/SC 11\.886-J/);
});
