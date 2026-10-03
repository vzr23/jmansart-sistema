'use strict';
/**
 * Converte uma linha da aba "Imóveis" nos campos que a tela do contrato pré-preenche.
 * Devolve SOMENTE o necessário para o contrato (não envia telefone, e-mail, observações etc.).
 * Campos que a planilha não tem (gênero, nacionalidade, profissão, órgão emissor, comarca, área) ficam para a tela.
 */
const t = (v) => String(v ?? '').trim();
const juntar = (...partes) => partes.map(t).filter(Boolean).join(', ');

function mapearImovelParaContrato(row) {
  const pj = t(row['Tipo Vendedor']).toUpperCase() === 'PJ';
  const avisos = [];
  if (pj) {
    avisos.push('Vendedor cadastrado como pessoa jurídica: o modelo atual de contrato é para pessoa física. Confira os dados antes de gerar.');
  }
  return {
    id: t(row['ID']),
    tipo_vendedor: pj ? 'PJ' : 'PF',
    conjuge: t(row['Cônjuge']),
    proprietario: {
      nome: t(row['Nome / Razão Social']),
      cpf: t(row['CPF / CNPJ']),
      estado_civil: t(row['Estado Civil']),
      rua: t(row['Logradouro Vendedor']),
      numero: juntar(row['Número Vendedor'], row['Complemento Vendedor']),
      bairro: t(row['Bairro Vendedor']),
      cidade: t(row['Cidade Vendedor']),
      uf: t(row['UF Vendedor']),
      cep: t(row['CEP Vendedor']),
    },
    imovel: {
      matricula: t(row['Matrícula']),
      tipo_imovel: t(row['Subtipo'] || row['Tipo']).toLowerCase(),
      logradouro_imovel: juntar(row['Logradouro Imóvel'], row['Número Imóvel'], row['Complemento Imóvel']),
      bairro_imovel: t(row['Bairro Imóvel']),
      municipio_imovel: t(row['Cidade Imóvel']),
      uf_imovel: t(row['UF Imóvel']),
    },
    valor: t(row['Valor']),
    avisos,
  };
}

module.exports = { mapearImovelParaContrato };
