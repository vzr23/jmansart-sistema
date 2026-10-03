'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../utils/formatadores');

test('moeda: parse e formatação sem erro de ponto flutuante', () => {
  assert.equal(F.parseMoedaBR('R$ 1.500.000,00'), 150000000);
  assert.equal(F.parseMoedaBR('1500000'), 150000000);
  assert.equal(F.parseMoedaBR('1.500,5'), 150050);
  assert.equal(F.parseMoedaBR('1500.75'), 150075);
  assert.equal(F.parseMoedaBR('1.500'), 150000); // ponto de milhar
  assert.equal(F.parseMoedaBR(0.1 + 0.2), 30);   // 0,30
  assert.equal(F.parseMoedaBR(19.99), 1999);
  assert.equal(F.formatarMoeda(150000000), 'R$ 1.500.000,00');
  assert.equal(F.formatarMoeda(5), 'R$ 0,05');
  assert.equal(F.formatarMoeda(123456), 'R$ 1.234,56');
  for (const x of ['', 'abc', '-5', 'R$', '1,234']) assert.throws(() => F.parseMoedaBR(x), RangeError, x);
});

test('área em m² no formato brasileiro', () => {
  assert.equal(F.formatarArea('21282,18'), '21.282,18');
  assert.equal(F.formatarArea('21.282,18'), '21.282,18');
  assert.equal(F.formatarArea('500'), '500');
  assert.equal(F.formatarArea('1250,5'), '1.250,50');
  assert.throws(() => F.formatarArea('0'), RangeError);
});

test('percentual', () => {
  assert.equal(F.formatarPercentual(6), '6');
  assert.equal(F.formatarPercentual('1,5'), '1,5');
  assert.equal(F.formatarPercentual('2,25'), '2,25');
  assert.throws(() => F.formatarPercentual('101'), RangeError);
});

test('CPF e CEP (dados fictícios)', () => {
  assert.equal(F.formatarCpf('11111111111'), '111.111.111-11');
  assert.equal(F.formatarCpf('222.222.222-22'), '222.222.222-22');
  assert.equal(F.formatarCep('89000000'), '89000-000');
  assert.equal(F.formatarCep('89000-000'), '89000-000');
  assert.throws(() => F.formatarCpf('123'), RangeError);
  assert.throws(() => F.formatarCep('1234'), RangeError);
});

test('CPF: dígitos verificadores (usado só como aviso)', () => {
  assert.equal(F.cpfDigitosValidos('529.982.247-25'), true);
  assert.equal(F.cpfDigitosValidos('52998224725'), true);
  assert.equal(F.cpfDigitosValidos('529.982.247-24'), false); // dígito errado
  assert.equal(F.cpfDigitosValidos('111.111.111-11'), false); // sequência repetida
  assert.equal(F.cpfDigitosValidos('123'), false);
  assert.equal(F.cpfDigitosValidos(''), false);
});
