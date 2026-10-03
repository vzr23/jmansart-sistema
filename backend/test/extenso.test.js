'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { numeroPorExtenso, moedaPorExtenso, percentualPorExtenso, dataPorExtenso } = require('../utils/extenso');

test('numeroPorExtenso: casos-chave', () => {
  const casos = {
    0: 'zero', 1: 'um', 6: 'seis', 15: 'quinze', 21: 'vinte e um', 90: 'noventa',
    100: 'cem', 101: 'cento e um', 111: 'cento e onze', 120: 'cento e vinte', 121: 'cento e vinte e um',
    180: 'cento e oitenta', 200: 'duzentos', 999: 'novecentos e noventa e nove',
    1000: 'mil', 1001: 'mil e um', 1100: 'mil e cem',
    1234: 'mil, duzentos e trinta e quatro', 2300: 'dois mil e trezentos',
    10000: 'dez mil', 101000: 'cento e um mil',
    1000000: 'um milhão', 1000001: 'um milhão e um', 1500000: 'um milhão e quinhentos mil',
    2000000: 'dois milhões',
    12345678: 'doze milhões, trezentos e quarenta e cinco mil, seiscentos e setenta e oito',
    2500300: 'dois milhões, quinhentos mil e trezentos',
    1000000000: 'um bilhão',
  };
  for (const [n, esperado] of Object.entries(casos)) {
    assert.equal(numeroPorExtenso(Number(n)), esperado, `n=${n}`);
  }
});

test('numeroPorExtenso: rejeita entradas inválidas', () => {
  for (const x of [-1, 1.5, NaN, 1e15, '10']) assert.throws(() => numeroPorExtenso(x), RangeError);
});

test('moedaPorExtenso (a partir de centavos)', () => {
  assert.equal(moedaPorExtenso(0), 'zero reais');
  assert.equal(moedaPorExtenso(100), 'um real');
  assert.equal(moedaPorExtenso(1), 'um centavo');
  assert.equal(moedaPorExtenso(150000000), 'um milhão e quinhentos mil reais');
  assert.equal(moedaPorExtenso(100000000), 'um milhão de reais');
  assert.equal(moedaPorExtenso(200000000), 'dois milhões de reais');
  assert.equal(moedaPorExtenso(123456), 'mil, duzentos e trinta e quatro reais e cinquenta e seis centavos');
  assert.equal(moedaPorExtenso(250000), 'dois mil e quinhentos reais');
  assert.equal(moedaPorExtenso(50), 'cinquenta centavos');
  assert.equal(moedaPorExtenso(150), 'um real e cinquenta centavos');
  assert.throws(() => moedaPorExtenso(12.5), RangeError);
  assert.throws(() => moedaPorExtenso(-1), RangeError);
});

test('percentual e prazo (valores padrão do contrato)', () => {
  assert.equal(percentualPorExtenso(6), 'seis');        // comissão
  assert.equal(percentualPorExtenso(2), 'dois');        // multa
  assert.equal(percentualPorExtenso(1), 'um');          // juros ao mês
  assert.equal(percentualPorExtenso('1,5'), 'um vírgula cinco');
  assert.equal(percentualPorExtenso(0.05), 'zero vírgula zero cinco');
  assert.equal(percentualPorExtenso(12.25), 'doze vírgula vinte e cinco');
  assert.equal(percentualPorExtenso('6,00'), 'seis');
  assert.equal(numeroPorExtenso(120), 'cento e vinte');  // prazo_dias
  assert.throws(() => percentualPorExtenso('abc'), RangeError);
  assert.throws(() => percentualPorExtenso('1,555'), RangeError);
});

test('dataPorExtenso', () => {
  assert.equal(dataPorExtenso('2026-09-17'), '17 de setembro de 2026');
  assert.equal(dataPorExtenso('17/09/2026'), '17 de setembro de 2026');
  assert.equal(dataPorExtenso('2026-10-01'), '1º de outubro de 2026');
  assert.equal(dataPorExtenso(new Date(2026, 2, 5)), '5 de março de 2026');
  assert.throws(() => dataPorExtenso('2026-02-30'), RangeError);
  assert.throws(() => dataPorExtenso('31/04/2026'), RangeError);
  assert.throws(() => dataPorExtenso('amanhã'), RangeError);
});
