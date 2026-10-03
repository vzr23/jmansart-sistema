'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { renderTemplate, TemplateError } = require('../utils/templateEngine');

// Pessoas FICTÍCIAS (nenhum dado real).
const MARIA = { nome: 'Maria Souza Teste', genero: 'F', nacionalidade: 'brasileira', rg: '1.111.111', orgao_emissor: 'SSP SC', cpf: '111.111.111-11' };
const JOAO  = { nome: 'João da Silva Teste', genero: 'M', nacionalidade: 'brasileiro', rg: '2.222.222', orgao_emissor: 'SSP SC', cpf: '222.222.222-22' };
const ANA   = { nome: 'Ana Conceição Teste', genero: 'F', nacionalidade: 'brasileira', rg: '3.333.333', orgao_emissor: '', cpf: '333.333.333-33' };

// Trechos copiados do modelo real (cabeçalho e cláusulas com PL/G).
const CABECALHO =
  '{{#cada proprietarios separador="; "}}**{{NOME}}**, {{nacionalidade}}, portador{{G:|a}} do RG {{rg}} {{orgao_emissor}}, ' +
  'inscrit{{G:o|a}} no CPF {{cpf}}, residente e domiciliad{{G:o|a}} em Blumenau{{/cada}}, ' +
  'na condição de {{PL:PROPRIETÁRIO|PROPRIETÁRIOS}} do imóvel, {{PL:autoriza|autorizam}} a J.Mansart a intermediar a venda.';
const CLAUSULA =
  '{{PL:O PROPRIETÁRIO considera|Os PROPRIETÁRIOS consideram}} receber contrapropostas, mas não {{PL:está obrigado|estão obrigados}} a aceitá-las. ' +
  'Comissão paga {{PL:pelo PROPRIETÁRIO|pelos PROPRIETÁRIOS}}.';

const render = (tpl, proprietarios, extra = {}) => renderTemplate(tpl, { proprietarios, ...extra });

test('1 proprietária (F): singular e feminino', () => {
  const t = render(CABECALHO, [MARIA]);
  assert.match(t, /^\*\*MARIA SOUZA TESTE\*\*, brasileira, portadora do RG 1\.111\.111 SSP SC, inscrita no CPF 111\.111\.111-11, residente e domiciliada em Blumenau,/);
  assert.match(t, /na condição de PROPRIETÁRIO do imóvel, autoriza a J\.Mansart/);
  assert.doesNotMatch(t, /PROPRIETÁRIOS|autorizam|;/);
});

test('1 proprietário (M): singular e masculino', () => {
  const t = render(CABECALHO, [JOAO]);
  assert.match(t, /portador do RG 2\.222\.222 SSP SC, inscrito no CPF 222\.222\.222-22, residente e domiciliado em Blumenau,/);
  assert.doesNotMatch(t, /portadora|inscrita|domiciliada/);
});

test('2 proprietários (M e F): plural, gênero individual, separados por ";"', () => {
  const t = render(CABECALHO, [JOAO, MARIA]);
  const [p1, p2] = t.split('; ');
  assert.match(p1, /JOÃO DA SILVA TESTE\*\*, brasileiro, portador do RG .*inscrito .*domiciliado em Blumenau$/);
  assert.match(p2, /^\*\*MARIA SOUZA TESTE\*\*, brasileira, portadora do RG .*inscrita .*domiciliada em Blumenau,/);
  assert.match(t, /na condição de PROPRIETÁRIOS do imóvel, autorizam a J\.Mansart/);
});

test('3 proprietários (F, M, F): 3 blocos, plural, gêneros intercalados', () => {
  const t = render(CABECALHO, [MARIA, JOAO, ANA]);
  assert.equal(t.split('; ').length, 3);
  const [p1, p2, p3] = t.split('; ');
  assert.match(p1, /portadora .*inscrita .*domiciliada/);
  assert.match(p2, /portador .*inscrito .*domiciliado/);
  assert.match(p3, /ANA CONCEIÇÃO TESTE\*\*, brasileira, portadora .*inscrita .*domiciliada/);
  assert.match(t, /PROPRIETÁRIOS do imóvel, autorizam/);
  assert.doesNotMatch(t, /autoriza a/);
});

test('cláusulas com PL: singular com 1; plural com 2 e 3', () => {
  assert.match(render(CLAUSULA, [MARIA]), /^O PROPRIETÁRIO considera receber contrapropostas, mas não está obrigado a aceitá-las\. Comissão paga pelo PROPRIETÁRIO\.$/);
  for (const lista of [[MARIA, JOAO], [MARIA, JOAO, ANA]]) {
    assert.match(render(CLAUSULA, lista), /^Os PROPRIETÁRIOS consideram receber contrapropostas, mas não estão obrigados a aceitá-las\. Comissão paga pelos PROPRIETÁRIOS\.$/);
  }
});

test('campo opcional vazio não deixa espaço antes da vírgula', () => {
  const t = render('{{#cada proprietarios}}RG {{rg}} {{orgao_emissor}}, CPF {{cpf}}{{/cada}}', [ANA]);
  assert.equal(t, 'RG 3.333.333, CPF 333.333.333-33');
});

test('bloco de assinaturas repete por proprietário e não usa separador', () => {
  const t = render('{{#cada proprietarios}}\n____\n**{{NOME}}**\nCPF {{cpf}}\n{{/cada}}\nJ.Mansart', [MARIA, JOAO]);
  assert.equal(t, '\n____\n**MARIA SOUZA TESTE**\nCPF 111.111.111-11\n\n____\n**JOÃO DA SILVA TESTE**\nCPF 222.222.222-22\n\nJ.Mansart');
});

test('#se exclusividade: só "não" inclui a cláusula 2.3; "sim" escolhe o outro texto', () => {
  const tpl = '{{#se exclusividade = nao}}CLAUSULA23{{/se}}|"{{#se exclusividade = nao}}não exclusividade{{/se}}{{#se exclusividade = sim}}exclusividade{{/se}}"';
  assert.equal(render(tpl, [MARIA], { exclusividade: 'nao' }), 'CLAUSULA23|"não exclusividade"');
  assert.equal(render(tpl, [MARIA], { exclusividade: 'sim' }), '|"exclusividade"');
});

test('variáveis globais e valores com acento/m²', () => {
  const t = render('{{tipo_imovel}} de {{area_m2}} m² em {{municipio_imovel}}; “aspas” e ‘simples’.', [MARIA],
    { tipo_imovel: 'terreno', area_m2: '21.282,18', municipio_imovel: 'Blumenau' });
  assert.equal(t, 'terreno de 21.282,18 m² em Blumenau; “aspas” e ‘simples’.');
});

test('falhas explícitas (nunca gerar contrato com lacuna)', () => {
  assert.throws(() => render('{{variavel_inexistente}}', [MARIA]), /Variável ausente: variavel_inexistente/);
  assert.throws(() => render('{{#cada proprietarios}}{{rg}}{{/cada}}', [{ ...MARIA, rg: undefined }]), /Variável ausente: rg/);
  assert.throws(() => render('{{G:o|a}}', [MARIA]), /dentro de/);
  assert.throws(() => render('{{NOME}}', [MARIA]), /dentro de/);
  assert.throws(() => render('{{#cada proprietarios}}{{G:o|a}}{{/cada}}', [{ ...MARIA, genero: '' }]), /Gênero inválido/);
  assert.throws(() => render('{{#cada proprietarios}}{{G:o|a}}{{/cada}}', [{ ...MARIA, genero: 'X' }]), /Gênero inválido/);
  assert.throws(() => renderTemplate('x', { proprietarios: [] }), TemplateError);
  assert.throws(() => renderTemplate('x', {}), TemplateError);
  assert.throws(() => render('{{#cada proprietarios}}sem fechar', [MARIA]), /não foi fechado/);
  assert.throws(() => render('{{/cada}}', [MARIA]), /sem abertura/);
  assert.throws(() => render('{{PL:so uma opcao}}', [MARIA]), /2 opções/);
  assert.throws(() => render('{{#se exclusividade = nao}}x{{/se}}', [MARIA]), /Variável ausente: exclusividade/);
  assert.throws(() => render('{{isto não é variável}}', [MARIA]), /não reconhecido/);
});

test('gênero aceita minúscula (m/f)', () => {
  assert.equal(render('{{#cada proprietarios}}inscrit{{G:o|a}}{{/cada}}', [{ ...JOAO, genero: 'm' }]), 'inscrito');
});

test('opção vazia no G: "portador{{G:|a}}" => portador (M) / portadora (F) — o modelo original tinha "{{G:o|a}}", que gera "portadoro"', () => {
  assert.equal(render('portador{{#cada proprietarios}}{{/cada}}', [MARIA]), 'portador'); // sanity
  assert.equal(render('{{#cada proprietarios}}portador{{G:|a}}{{/cada}}', [JOAO]), 'portador');
  assert.equal(render('{{#cada proprietarios}}portador{{G:|a}}{{/cada}}', [MARIA]), 'portadora');
});
