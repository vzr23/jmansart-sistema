'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { gerarTextoAutorizacaoVenda, montarContexto, ContratoValidationError } = require('../utils/contratoAutorizacao');

// Todos os dados abaixo são FICTÍCIOS.
const MARIA = { nome: 'Maria Aparecida Teste', genero: 'F', nacionalidade: 'brasileira', profissao: 'empresária', estado_civil: 'casada', rg: '1.234.567', orgao_emissor: 'SSP SC', cpf: '529.982.247-25', rua: 'Rua Exemplo', numero: '100', bairro: 'Vila Fictícia', cidade: 'Blumenau', uf: 'SC', cep: '89000-000' };
const JOSE = { ...MARIA, estado_civil: 'casado', nome: "José Antônio d'Ávila Teste", genero: 'M', nacionalidade: 'brasileiro', profissao: 'advogado', orgao_emissor: '', cpf: '222.222.222-22', rg: '7.654.321' };
const ANA = { ...MARIA, nome: 'Ana Conceição Teste', genero: 'F', cpf: '333.333.333-33', rg: '3.333.333' };
const IMOVEL = { matricula: '12.345', comarca: 'Blumenau', tipo_imovel: 'terreno', area_m2: '21282,18', logradouro_imovel: 'Rodovia SC-999, km 5', bairro_imovel: 'Bairro Fictício', municipio_imovel: 'Blumenau', uf_imovel: 'SC' };
const CONDICOES = { valor: 'R$ 1.500.000,00', cidade_assinatura: 'Blumenau', data_assinatura: '2026-09-17' };
const entrada = (proprietarios, condicoes = {}) => ({ proprietarios, imovel: IMOVEL, condicoes: { ...CONDICOES, ...condicoes } });
const gerar = (props, cond) => gerarTextoAutorizacaoVenda(entrada(props, cond));
const paragrafoAbertura = (texto) => texto.split(/\n\s*\n/)[1];

test('1 proprietária (F): singular e feminino em todo o texto', () => {
  const { texto } = gerar([MARIA]);
  assert.match(texto, /inscrita no CPF 529\.982\.247-25, residente e domiciliada na Rua Exemplo/);
  assert.match(texto, /na condição de PROPRIETÁRIO do imóvel/);
  assert.match(texto, /, autoriza a JMansart/);
  assert.match(texto, /O PROPRIETÁRIO considera receber contrapropostas, mas não está obrigado a aceitá-las/);
  assert.match(texto, /paga pelo PROPRIETÁRIO no momento pactuado/);
  assert.doesNotMatch(texto, /PROPRIETÁRIOS|autorizam|estão obrigados/);
});

test('1 proprietário (M): inscrito/domiciliado', () => {
  const { texto } = gerar([JOSE]);
  assert.match(texto, /inscrito no CPF 222\.222\.222-22, residente e domiciliado na Rua Exemplo/);
  assert.doesNotMatch(texto, /inscrita no CPF|domiciliada/); // (a J.Mansart é "inscrita no CRECI": não confundir)
});

test('2 proprietários (M e F): concordância individual + plural, separados por ";"', () => {
  const { texto } = gerar([JOSE, MARIA]);
  const [p1, p2] = paragrafoAbertura(texto).split('; ');
  assert.match(p1, /^\*\*JOSÉ ANTÔNIO D'ÁVILA TESTE\*\*, brasileiro, advogado, casado, inscrito .*domiciliado na/);
  assert.match(p2, /^\*\*MARIA APARECIDA TESTE\*\*, brasileira, empresária, casada, inscrita .*domiciliada na/);
  assert.match(texto, /na condição de PROPRIETÁRIOS do imóvel/);
  assert.match(texto, /, autorizam a JMansart/);
  assert.match(texto, /Os PROPRIETÁRIOS consideram receber contrapropostas, mas não estão obrigados/);
  assert.match(texto, /receberá dos PROPRIETÁRIOS/);
  assert.match(texto, /os PROPRIETÁRIOS estarão isentos/);
  assert.doesNotMatch(texto, /O PROPRIETÁRIO|autoriza a/);
});

test('3 proprietários (F, M, F): 3 blocos e 3 assinaturas, gêneros intercalados', () => {
  const { texto } = gerar([MARIA, JOSE, ANA]);
  const blocos = paragrafoAbertura(texto).split('; ');
  assert.equal(blocos.length, 3);
  assert.match(blocos[0], /inscrita .*domiciliada/);
  assert.match(blocos[1], /inscrito .*domiciliado/);
  assert.match(blocos[2], /inscrita .*domiciliada/);
  assert.equal(texto.match(/^CPF /gm).length, 3);
  assert.match(texto, /na condição de PROPRIETÁRIOS do imóvel/);
  assert.match(texto, /, autorizam a JMansart/);
});

test('valores por extenso, padrões e dados fixos da J.Mansart', () => {
  const { texto } = gerar([MARIA]);
  assert.match(texto, /R\$ 1\.500\.000,00 \(um milhão e quinhentos mil reais\)/);
  assert.match(texto, /6% \(seis por cento\)/);
  assert.match(texto, /multa de 2% \(dois por cento\), juros de 1% \(um por cento\) ao mês/);
  assert.match(texto, /prazo de 120 \(cento e vinte\) dias/);
  assert.match(texto, /Blumenau, 17 de setembro de 2026\./);
  assert.match(texto, /terreno de 21\.282,18 m² localizado em Rodovia SC-999, km 5, bairro Bairro Fictício, município de Blumenau, SC/);
  assert.match(texto, /JMansart Negócios Imobiliários Ltda, inscrita no CRECI\/SC 11\.886-J e CNPJ 67\.589\.336\/0001-02/);
  assert.match(texto, /^CNPJ 67\.589\.336\/0001-02$/m);
});

test('valores personalizados e com decimais', () => {
  const { texto } = gerar([MARIA], { comissao_pct: '5,5', prazo_dias: 90, multa_pct: '0,5', juros_pct_mes: '1,5', valor: '250000' });
  assert.match(texto, /R\$ 250\.000,00 \(duzentos e cinquenta mil reais\)/);
  assert.match(texto, /5,5% \(cinco vírgula cinco por cento\)/);
  assert.match(texto, /multa de 0,5% \(zero vírgula cinco por cento\), juros de 1,5% \(um vírgula cinco por cento\)/);
  assert.match(texto, /prazo de 90 \(noventa\) dias/);
});

test('exclusividade fixa em "não": cláusula 2.3 presente; "sim" é recusado', () => {
  const { texto } = gerar([MARIA]);
  assert.match(texto, /\*\*2\.3\.\*\* Caso a negociação ocorra diretamente/);
  assert.match(texto, /“não exclusividade”/);
  assert.doesNotMatch(texto, /“exclusividade”/);
  assert.throws(() => gerar([MARIA], { exclusividade: 'sim' }), (e) => e instanceof ContratoValidationError && e.erros[0].campo === 'condicoes.exclusividade');
  assert.doesNotThrow(() => gerar([MARIA], { exclusividade: 'não' }));
});

test('sem marcadores ou lixo no texto final; referências cruzadas corretas', () => {
  for (const lista of [[MARIA], [MARIA, JOSE], [MARIA, JOSE, ANA]]) {
    const { texto } = gerar(lista);
    assert.doesNotMatch(texto, /\{\{|\}\}|undefined|NaN|\[object|null/);
    assert.match(texto, /conforme a cláusula 2,/);
    assert.match(texto, /observado o item 1 acima/);
    assert.match(texto, /previstas no item 4,/);
  }
});

test('RG e órgão emissor não fazem parte do contrato (mesmo se enviados)', () => {
  const { texto } = gerar([MARIA, JOSE]);
  assert.doesNotMatch(texto, /\bRG\b|portador|1\.234\.567|7\.654\.321|SSP/);
  assert.match(paragrafoAbertura(texto), /casado, inscrito no CPF/);
  assert.doesNotMatch(texto, / ,/);
});

test('normaliza UF e CEP digitados sem máscara; data padrão = hoje (por extenso)', () => {
  const { texto } = gerarTextoAutorizacaoVenda({
    proprietarios: [{ ...MARIA, uf: 'sc', cep: '89000000', cpf: '52998224725' }],
    imovel: IMOVEL,
    condicoes: { valor: '1000000', cidade_assinatura: 'Blumenau' },
  });
  assert.match(texto, /Blumenau, SC, CEP 89000-000/);
  assert.match(texto, /CPF 529\.982\.247-25/);
  assert.match(texto, /um milhão de reais/);
  assert.match(texto, /Blumenau, \d{1,2}º? de [a-zç]+ de \d{4}\./);
});

test('CPF: dígitos inválidos geram AVISO (não bloqueiam); formato errado bloqueia', () => {
  const ruim = gerar([MARIA, JOSE]);
  assert.deepEqual(ruim.avisos.map((a) => a.campo), ['proprietarios[1].cpf']);
  assert.match(ruim.avisos[0].mensagem, /dígitos verificadores/);
  assert.deepEqual(gerar([MARIA]).avisos, []);
  assert.throws(() => gerar([{ ...MARIA, cpf: '123.456.789-0' }]), (e) => e.erros.some((x) => x.campo === 'proprietarios[0].cpf'));
});

test('validação reúne todos os erros de uma vez', () => {
  let erro;
  try {
    montarContexto({
      proprietarios: [{ ...MARIA, nome: '', genero: 'X', uf: 'S', cep: '123', numero: '' }],
      imovel: { ...IMOVEL, area_m2: 'abc', matricula: '' },
      condicoes: { valor: '0', prazo_dias: 0, comissao_pct: '150', cidade_assinatura: '', data_assinatura: '2026-02-30' },
    });
  } catch (e) { erro = e; }
  assert.ok(erro instanceof ContratoValidationError);
  const campos = erro.erros.map((e) => e.campo);
  for (const esperado of [
    'proprietarios[0].nome', 'proprietarios[0].genero', 'proprietarios[0].uf', 'proprietarios[0].cep', 'proprietarios[0].numero',
    'imovel.area_m2', 'imovel.matricula', 'condicoes.valor', 'condicoes.prazo_dias', 'condicoes.comissao_pct',
    'condicoes.cidade_assinatura', 'condicoes.data_assinatura',
  ]) assert.ok(campos.includes(esperado), `faltou erro para ${esperado}`);
});

test('proprietários: mínimo 1 e máximo 10', () => {
  assert.throws(() => gerar([]), ContratoValidationError);
  assert.throws(() => montarContexto({ imovel: IMOVEL, condicoes: CONDICOES }), ContratoValidationError);
  assert.doesNotThrow(() => gerar(Array(10).fill(MARIA)));
  assert.throws(() => gerar(Array(11).fill(MARIA)), /máximo de 10/);
});

test('sanitiza entradas: sem "*", chaves nem quebras de linha (não injeta marcação)', () => {
  const { texto } = gerar([{ ...MARIA, nome: 'Fulana **Teste**\n{{NOME}}', profissao: 'a\u0000b' }]);
  assert.match(texto, /^\*\*FULANA TESTE NOME\*\*, brasileira, a b,/m);
  assert.doesNotMatch(texto, /\{\{/);
});
