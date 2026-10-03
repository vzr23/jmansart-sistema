'use strict';
/**
 * Conversão e formatação de entradas no padrão brasileiro.
 * Dinheiro e decimais trabalham com inteiros "escalados" (centavos etc.)
 * para evitar erro de ponto flutuante.
 */

const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');

/**
 * Converte texto/número em inteiro escalado por 10^casas.
 * Regra: com vírgula => vírgula é decimal e ponto é milhar ("1.500,5").
 * Sem vírgula, "1.50" (1-2 dígitos após o ponto) é decimal; "1.500" é milhar.
 */
function parseDecimalBR(entrada, casas = 2) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada) || entrada < 0) throw new RangeError(`Valor inválido: ${entrada}`);
    return Math.round(entrada * 10 ** casas);
  }
  let s = String(entrada ?? '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') throw new RangeError('Valor vazio');
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    // ponto decimal (ex.: "1.5", "1500.75")
  } else {
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d+)?$/.test(s)) throw new RangeError(`Valor inválido: ${entrada}`);
  const [int, frac = ''] = s.split('.');
  if (frac.length > casas && /[1-9]/.test(frac.slice(casas))) {
    throw new RangeError(`Máximo de ${casas} casas decimais: ${entrada}`);
  }
  const n = parseInt(int + frac.slice(0, casas).padEnd(casas, '0'), 10);
  if (!Number.isSafeInteger(n)) throw new RangeError('Valor acima do limite suportado');
  return n;
}

function formatarDecimalBR(escalado, casas = 2) {
  const s = String(escalado).padStart(casas + 1, '0');
  const int = s.slice(0, s.length - casas).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return casas ? `${int},${s.slice(-casas)}` : int;
}

/** "R$ 1.500.000,00" (ou número) -> centavos inteiros. */
const parseMoedaBR = (entrada) => parseDecimalBR(entrada, 2);
/** centavos -> "R$ 1.500.000,00" */
const formatarMoeda = (centavos) => `R$ ${formatarDecimalBR(centavos, 2)}`;

/** Área em m²: "21282,18" ou "21.282,18" -> "21.282,18"; inteiro fica sem decimais ("500"). */
function formatarArea(entrada) {
  const centesimos = parseDecimalBR(entrada, 2);
  if (centesimos <= 0) throw new RangeError('Área deve ser maior que zero');
  return centesimos % 100 === 0
    ? formatarDecimalBR(centesimos / 100, 0)
    : formatarDecimalBR(centesimos, 2);
}

/** Percentual: 6 -> "6"; "1,5" -> "1,5". Aceita 0 a 100 com até 2 casas. */
function formatarPercentual(entrada) {
  const centesimos = parseDecimalBR(entrada, 2);
  if (centesimos > 10000) throw new RangeError('Percentual acima de 100%');
  return centesimos % 100 === 0
    ? String(centesimos / 100)
    : formatarDecimalBR(centesimos, 2).replace(/0$/, '');
}

/** Formata CPF (11 dígitos). Valida só o formato, não os dígitos verificadores. */
function formatarCpf(entrada) {
  const d = somenteDigitos(entrada);
  if (d.length !== 11) throw new RangeError('CPF deve ter 11 dígitos');
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Confere os dígitos verificadores do CPF. Usado apenas como AVISO (não bloqueia),
 * para permitir CPFs de teste. Sequências repetidas (111.111.111-11) são inválidas.
 */
function cpfDigitosValidos(entrada) {
  const d = somenteDigitos(entrada);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(d.slice(0, 9)) === Number(d[9]) && dv(d.slice(0, 10)) === Number(d[10]);
}

function formatarCep(entrada) {
  const d = somenteDigitos(entrada);
  if (d.length !== 8) throw new RangeError('CEP deve ter 8 dígitos');
  return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

module.exports = {
  somenteDigitos, parseDecimalBR, formatarDecimalBR,
  parseMoedaBR, formatarMoeda, formatarArea, formatarPercentual,
  formatarCpf, cpfDigitosValidos, formatarCep,
};
