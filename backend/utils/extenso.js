'use strict';
/**
 * Números, valores, percentuais e datas por extenso (português do Brasil).
 * Funções puras, sem dependências. Valores em dinheiro trabalham em CENTAVOS
 * (inteiros) para evitar erro de ponto flutuante.
 */

const UNIDADES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Escalas acima de mil: [singular, plural]
const ESCALAS = [null, null, ['milhão', 'milhões'], ['bilhão', 'bilhões'], ['trilhão', 'trilhões']];
const LIMITE = 1e15; // exclusivo

function ate999(n) {
  if (n === 100) return 'cem';
  const partes = [];
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c) partes.push(CENTENAS[c]);
  if (r) {
    if (r < 20) {
      partes.push(UNIDADES[r]);
    } else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(' e ');
}

/** Inteiro >= 0 por extenso (masculino). Ex.: 120 -> "cento e vinte". */
function numeroPorExtenso(n) {
  if (!Number.isInteger(n) || n < 0 || n >= LIMITE) {
    throw new RangeError(`Número fora do intervalo suportado: ${n}`);
  }
  if (n === 0) return 'zero';

  // Divide em grupos de 3 dígitos, do menos para o mais significativo.
  const grupos = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }

  const partes = [];
  const valores = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    let texto;
    if (i === 0) texto = ate999(g);
    else if (i === 1) texto = g === 1 ? 'mil' : `${ate999(g)} mil`;
    else texto = `${ate999(g)} ${ESCALAS[i][g === 1 ? 0 : 1]}`;
    partes.push(texto);
    valores.push(g);
  }

  if (partes.length === 1) return partes[0];
  const ultimo = valores[valores.length - 1];
  const sepFinal = ultimo < 100 || ultimo % 100 === 0 ? ' e ' : ', ';
  return partes.slice(0, -1).join(', ') + sepFinal + partes[partes.length - 1];
}

/**
 * Valor em reais por extenso a partir de CENTAVOS inteiros.
 * 150000000 -> "um milhão e quinhentos mil reais"
 */
function moedaPorExtenso(centavos) {
  if (!Number.isInteger(centavos) || centavos < 0) {
    throw new RangeError(`Valor inválido (esperado inteiro de centavos >= 0): ${centavos}`);
  }
  const reais = Math.floor(centavos / 100);
  const cent = centavos % 100;
  if (reais >= LIMITE) throw new RangeError('Valor acima do limite suportado');

  if (reais === 0 && cent === 0) return 'zero reais';

  let parteReais = '';
  if (reais > 0) {
    const de = reais >= 1e6 && reais % 1e6 === 0 ? ' de' : '';
    parteReais = `${numeroPorExtenso(reais)}${de} ${reais === 1 ? 'real' : 'reais'}`;
  }
  let parteCent = '';
  if (cent > 0) {
    parteCent = `${numeroPorExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`;
  }
  return [parteReais, parteCent].filter(Boolean).join(' e ');
}

/**
 * Percentual por extenso, SEM a expressão "por cento" (o modelo já a inclui).
 * Aceita número ou string ("6", "1,5"). Até 2 casas decimais.
 *  6 -> "seis" | 1.5 -> "um vírgula cinco" | 0.05 -> "zero vírgula zero cinco"
 */
function percentualPorExtenso(valor) {
  const s = String(valor).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new RangeError(`Percentual inválido: ${valor}`);
  const [inteiro, decimal] = s.split('.');
  const base = numeroPorExtenso(parseInt(inteiro, 10));
  if (!decimal || /^0+$/.test(decimal)) return base;
  const zeros = decimal.match(/^0*/)[0].length;
  const resto = parseInt(decimal.slice(zeros), 10);
  const fracao = [...Array(zeros).fill('zero'), numeroPorExtenso(resto)].join(' ');
  return `${base} vírgula ${fracao}`;
}

/** Data por extenso, ex.: "17 de setembro de 2026" ("1º de outubro de 2026"). */
function dataPorExtenso(entrada) {
  let d, m, a;
  if (entrada instanceof Date) {
    if (Number.isNaN(entrada.getTime())) throw new RangeError('Data inválida');
    d = entrada.getDate(); m = entrada.getMonth() + 1; a = entrada.getFullYear();
  } else {
    const s = String(entrada).trim();
    let r;
    if ((r = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { a = +r[1]; m = +r[2]; d = +r[3]; }
    else if ((r = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) { d = +r[1]; m = +r[2]; a = +r[3]; }
    else throw new RangeError(`Formato de data não reconhecido: ${entrada}`);
  }
  const teste = new Date(a, m - 1, d);
  if (teste.getFullYear() !== a || teste.getMonth() !== m - 1 || teste.getDate() !== d) {
    throw new RangeError(`Data inexistente: ${entrada}`);
  }
  return `${d === 1 ? '1º' : d} de ${MESES[m - 1]} de ${a}`;
}

module.exports = { numeroPorExtenso, moedaPorExtenso, percentualPorExtenso, dataPorExtenso };
