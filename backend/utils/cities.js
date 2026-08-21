/**
 * Mapeamento de cidades brasileiras para siglas.
 * Usado na geração automática de ID de imóvel.
 * Formato: SIGLA + sequencial (3 dígitos) + ano (4 dígitos)
 * Ex: BC0012026
 */

const CITY_MAP = {
  // Santa Catarina
  'balneario camboriu': 'BC',
  'florianopolis': 'FLP',
  'joinville': 'JVL',
  'blumenau': 'BLU',
  'itajai': 'ITJ',
  'camboriu': 'CAM',
  'brusque': 'BRQ',
  'jaragua do sul': 'JGS',
  'chapeco': 'CHP',
  'criciuma': 'CRI',
  'lages': 'LGS',
  'sao jose': 'SJS',
  'palhoca': 'PLH',
  'navegantes': 'NVG',
  'penha': 'PNH',
  'picarras': 'PCS',
  'porto belo': 'PBL',
  'itapema': 'IPM',
  'bombinhas': 'BMB',
  'balneario picarras': 'BPC',
  'tijucas': 'TJC',
  'biguacu': 'BGC',
  'gaspar': 'GSP',
  'indaial': 'IND',
  'pomerode': 'PMD',
  'sao francisco do sul': 'SFS',
  'laguna': 'LGN',
  'tubarao': 'TBR',
  'araranguá': 'ARG',
  'ararangua': 'ARG',
  'concordia': 'CCD',
  'videira': 'VDR',
  'cacador': 'CAC',
  'mafra': 'MFR',
  'canoinhas': 'CAN',
  'rio do sul': 'RDS',
  'ibirama': 'IBR',
  'timbó': 'TMB',
  'timbo': 'TMB',
  'xanxere': 'XAN',
  // São Paulo
  'sao paulo': 'SP',
  'campinas': 'CPS',
  'santos': 'STS',
  'sao bernardo do campo': 'SBC',
  'guarulhos': 'GRU',
  'sorocaba': 'SCA',
  'ribeirao preto': 'RBP',
  'sao jose dos campos': 'SJC',
  'osasco': 'OSC',
  'santo andre': 'SAN',
  // Rio de Janeiro
  'rio de janeiro': 'RJ',
  'niteroi': 'NIT',
  'campos dos goytacazes': 'CPG',
  'petr­opolis': 'PTR',
  'petropolis': 'PTR',
  'volta redonda': 'VRD',
  // Paraná
  'curitiba': 'CWB',
  'londrina': 'LON',
  'maringa': 'MGF',
  'foz do iguacu': 'FOZ',
  'ponta grossa': 'PNG',
  'cascavel': 'CSV',
  // Rio Grande do Sul
  'porto alegre': 'POA',
  'caxias do sul': 'CXS',
  'pelotas': 'PEL',
  'santa maria': 'STM',
  'canoas': 'CNS',
  // Outros
  'brasilia': 'BSB',
  'belo horizonte': 'BHZ',
  'salvador': 'SSA',
  'recife': 'REC',
  'fortaleza': 'FOR',
  'manaus': 'MAO',
  'belem': 'BEL',
  'goiania': 'GYN',
  'maceio': 'MCZ',
  'natal': 'NAT',
  'joao pessoa': 'JPA',
  'sao luis': 'SLZ',
  'teresina': 'THE',
  'aracaju': 'AJU',
  'porto velho': 'PVH',
  'rio branco': 'RBR',
  'macapa': 'MCP',
  'boa vista': 'BVB',
  'palmas': 'PMW',
  'cuiaba': 'CGB',
  'campo grande': 'CGR',
};

function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Retorna a sigla da cidade para uso no ID do imóvel.
 * Se não encontrada no mapa, gera automaticamente a partir das iniciais.
 * @param {string} cidade
 * @returns {string} sigla em maiúsculas (2-3 chars)
 */
function getCityAbbrev(cidade) {
  if (!cidade) return 'XX';

  const normalized = removeDiacritics(cidade);

  // Busca direta no mapa
  if (CITY_MAP[normalized]) return CITY_MAP[normalized];

  // Busca parcial (a cidade digitada contém a chave ou vice-versa)
  for (const [key, abbrev] of Object.entries(CITY_MAP)) {
    if (normalized === key || normalized.startsWith(key + ' ') || key.startsWith(normalized + ' ')) {
      return abbrev;
    }
  }

  // Geração automática: iniciais das palavras significativas
  const stopWords = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'a', 'o']);
  const words = normalized.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w));

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
}

module.exports = { getCityAbbrev, CITY_MAP };
