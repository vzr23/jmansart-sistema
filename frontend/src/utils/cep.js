/**
 * Utilitário de consulta de CEP via ViaCEP (gratuito, sem autenticação)
 * https://viacep.com.br/
 */

/**
 * Formata um valor de input para o padrão 00000-000
 */
export function formatarCep(valor) {
  let v = valor.replace(/\D/g, '').slice(0, 8);
  if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
  return v;
}

/**
 * Consulta o endereço de um CEP na API ViaCEP.
 * @param {string} cep - CEP com ou sem formatação
 * @returns {{ logradouro, bairro, cidade, uf } | null} — null se não encontrado
 */
export async function buscarEnderecoPorCep(cep) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error('Erro na requisição ao ViaCEP');

  const data = await res.json();
  if (data.erro) return null; // CEP válido mas não cadastrado

  return {
    logradouro: data.logradouro || '',
    bairro:     data.bairro     || '',
    cidade:     data.localidade || '',
    uf:         data.uf         || '',
  };
}
