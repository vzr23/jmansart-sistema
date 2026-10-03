/**
 * Máscaras de digitação para a tela do contrato (CPF, CEP, R$, decimais, UF).
 * Só formatam o que aparece no campo; quem valida de verdade é o servidor.
 */
export const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function mascaraCpf(v) {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function mascaraCep(v) {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Digita-se só números; o campo vai montando "R$ 1.234,56" (os dois últimos dígitos são os centavos). */
export function mascaraMoeda(v) {
  const d = somenteDigitos(v).replace(/^0+/, '').slice(0, 13);
  if (!d) return '';
  const p = d.padStart(3, '0');
  const reais = p.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${reais},${p.slice(-2)}`;
}

/** Valor vindo da planilha ("800000", "800.000,00", "R$ 800.000,00") -> máscara de moeda; '' se não der para entender. */
export function moedaDaPlanilha(v) {
  let s = String(v ?? '').replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s) return '';
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return '';
  return mascaraMoeda(String(Math.round(n * 100)));
}

/** Decimal brasileiro com até 2 casas (área, percentuais). Aceita "." e converte para ",". */
export function mascaraDecimal(v, maxInteiros = 12) {
  const s = String(v ?? '').replace(/\./g, ',').replace(/[^\d,]/g, '');
  const i = s.indexOf(',');
  if (i === -1) return s.slice(0, maxInteiros);
  return `${s.slice(0, i).slice(0, maxInteiros)},${s.slice(i + 1).replace(/,/g, '').slice(0, 2)}`;
}

export const mascaraInteiro = (v, max = 4) => somenteDigitos(v).slice(0, max);

export const mascaraUf = (v) => String(v ?? '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);

/** Mesma regra do servidor: só serve de AVISO (nunca bloqueia, para permitir CPFs de teste). */
export function cpfDigitosValidos(v) {
  const d = somenteDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
