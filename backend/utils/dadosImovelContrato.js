'use strict';
/**
 * Converte uma linha da aba "Imóveis" nos campos que a tela do contrato pré-preenche.
 * Devolve SOMENTE o necessário para o contrato (não envia telefone, e-mail, observações etc.).
 * Campos que a planilha não tem (gênero, nacionalidade, profissão, órgão emissor, comarca, área) ficam para a tela.
 */
// Traço sozinho ("-", "–", "—") é como a planilha marca "sem dado": vira vazio para não ir parar no contrato.
const t = (v) => {
  const s = String(v ?? '').trim();
  return /^[-–—]+$/.test(s) ? '' : s;
};
const juntar = (...partes) => partes.map(t).filter(Boolean).join(', ');

// Cadastros antigos guardam o endereço em UMA célula ("Rua, número, complemento, bairro[, cidade, UF, CEP]").
// Quando as colunas detalhadas estão vazias, separamos esse texto como melhor esforço; a tela pede conferência.
const INICIO_COMPLEMENTO = /^(apto?\.?|apartamento|ap\.?|casa|bloco|bl\.?|sala|lote|conjunto|conj\.?|cj\.?|sobrado|loja|unidade|torre|andar|fundos|box|quadra|qd\.?)(\s|\d|$)/i;

function separarEndereco(texto, comCidade) {
  const partes = t(texto).split(',').map((p) => p.trim()).filter(Boolean);
  let cep = '';
  let uf = '';
  let cidade = '';
  if (comCidade) {
    if (partes.length && /^\d{5}-?\d{3}$/.test(partes[partes.length - 1])) cep = partes.pop();
    if (partes.length && /^[A-Z]{2}$/.test(partes[partes.length - 1])) {
      uf = partes.pop();
      if (partes.length > 1) cidade = partes.pop();
    }
  }
  const [logradouro = '', numero = '', ...resto] = partes;
  let complemento = '';
  let bairro = '';
  if (resto.length === 1) {
    if (INICIO_COMPLEMENTO.test(resto[0])) complemento = resto[0];
    else bairro = resto[0];
  } else if (resto.length >= 2) {
    complemento = resto.slice(0, -1).join(', ');
    bairro = resto[resto.length - 1];
  }
  return { logradouro, numero, complemento, bairro, cidade, uf, cep };
}

function mapearImovelParaContrato(row) {
  const pj = t(row['Tipo Vendedor']).toUpperCase() === 'PJ';
  const avisos = [];
  if (pj) {
    avisos.push('Vendedor cadastrado como pessoa jurídica: o modelo atual de contrato é para pessoa física. Confira os dados antes de gerar.');
  }

  // Endereço do vendedor: colunas detalhadas; se vazias (cadastro antigo), usa o texto único "Endereço Vendedor".
  const vendTemDetalhe = ['Logradouro Vendedor', 'Número Vendedor', 'Bairro Vendedor', 'Cidade Vendedor'].some((c) => t(row[c]));
  const vendTexto = t(row['Endereço Vendedor']);
  let vend = {};
  let vendAntigo = false;
  if (!vendTemDetalhe && vendTexto) {
    vend = pj ? { logradouro: vendTexto } : separarEndereco(vendTexto, true);
    vendAntigo = true;
  }
  // Endereço do imóvel: mesma regra, com o texto único "Endereço Imóvel".
  const imovTemDetalhe = ['Logradouro Imóvel', 'Número Imóvel', 'Bairro Imóvel'].some((c) => t(row[c]));
  const imovTexto = t(row['Endereço Imóvel']);
  let imov = {};
  let imovAntigo = false;
  if (!imovTemDetalhe && imovTexto) {
    imov = separarEndereco(imovTexto, false);
    imovAntigo = true;
  }
  if (vendAntigo || imovAntigo) {
    const quais = vendAntigo && imovAntigo ? 'Endereços do vendedor e do imóvel lidos' : vendAntigo ? 'Endereço do vendedor lido' : 'Endereço do imóvel lido';
    avisos.push(`${quais} do cadastro antigo (campo único). Confira rua, número, complemento e bairro.`);
  }
  return {
    id: t(row['ID']),
    tipo_vendedor: pj ? 'PJ' : 'PF',
    conjuge: t(row['Cônjuge']),
    proprietario: {
      nome: t(row['Nome / Razão Social']),
      cpf: t(row['CPF / CNPJ']),
      estado_civil: t(row['Estado Civil']),
      rua: t(row['Logradouro Vendedor']) || vend.logradouro || '',
      numero: juntar(row['Número Vendedor'], row['Complemento Vendedor']) || juntar(vend.numero, vend.complemento),
      bairro: t(row['Bairro Vendedor']) || vend.bairro || '',
      cidade: t(row['Cidade Vendedor']) || vend.cidade || '',
      uf: t(row['UF Vendedor']) || vend.uf || '',
      cep: t(row['CEP Vendedor']) || vend.cep || '',
    },
    imovel: {
      matricula: t(row['Matrícula']),
      tipo_imovel: t(row['Subtipo'] || row['Tipo']).toLowerCase(),
      logradouro_imovel: juntar(row['Logradouro Imóvel'], row['Número Imóvel'], row['Complemento Imóvel'])
        || juntar(imov.logradouro, imov.numero, imov.complemento),
      bairro_imovel: t(row['Bairro Imóvel']) || imov.bairro || '',
      municipio_imovel: t(row['Cidade Imóvel']),
      uf_imovel: t(row['UF Imóvel']),
      area_m2: t(row['Área (m²)']),
    },
    prazo_dias: t(row['Prazo Autorização (dias)']),
    valor: t(row['Valor']),
    avisos,
  };
}

module.exports = { mapearImovelParaContrato };
