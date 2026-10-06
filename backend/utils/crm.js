'use strict';
/**
 * Regras do mini CRM (sem planilha, sem rede): status, datas, validações dos campos novos,
 * situação da autorização, filtros de listagem e compatibilidade comprador x imóvel.
 * Funções puras: recebem linhas da planilha (objetos "Cabeçalho -> valor") e devolvem dados simples.
 */
const { parseMoedaBR, formatarMoeda, formatarArea, parseDecimalBR } = require('./formatadores');

const STATUS_IMOVEL = ['Captação', 'Anunciado', 'Em negociação', 'Vendido', 'Cancelado'];
const STATUS_IMOVEL_ENCERRADOS = ['Vendido', 'Cancelado'];
const STATUS_CLIENTE = ['Novo', 'Em atendimento', 'Negociando', 'Fechado', 'Inativo'];
const STATUS_CLIENTE_ENCERRADOS = ['Fechado', 'Inativo'];
const TIPOS_IMOVEL = ['Residencial', 'Comercial'];
const SUBTIPOS_IMOVEL = ['Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Galpão', 'Sala'];
const PRAZO_PADRAO_DIAS = 120;
const DIAS_ALERTA_PADRAO = 15;
const TOLERANCIA_VALOR = 0.1; // "quase combina": até 10% fora da faixa de valor do comprador

const DIA_MS = 24 * 60 * 60 * 1000;

const t = (v) => String(v ?? '').trim();
const semAcento = (v) => t(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroValidacao';
  }
}

// ── Textos e links ───────────────────────────────────────────────────────────

/**
 * Texto livre para a planilha: tira caracteres de controle, limita o tamanho e neutraliza fórmulas
 * (a planilha interpreta "=...", "+...", "-...", "@..." como fórmula quando gravada com USER_ENTERED).
 */
function textoSeguro(valor, max = 200) {
  // eslint-disable-next-line no-control-regex
  let s = t(valor).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s;
}

/** Aceita só endereços http(s). Vazio é permitido. Devolve o link normalizado. */
function validarLink(valor, rotulo = 'Link') {
  const s = t(valor);
  if (!s) return '';
  if (s.length > 500) throw new ErroValidacao(`${rotulo} muito longo (máximo de 500 caracteres).`);
  let u;
  try { u = new URL(s); } catch { throw new ErroValidacao(`${rotulo} inválido. Use um endereço que comece com http:// ou https://.`); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ErroValidacao(`${rotulo} inválido. Use um endereço que comece com http:// ou https://.`);
  }
  return u.href;
}

// ── Datas (sempre dia/mês/ano; fuso de São Paulo) ────────────────────────────

/** "dd/mm/aaaa" ou "aaaa-mm-dd" -> Date (UTC, meia-noite) ou null. */
function parseData(valor) {
  const s = t(valor);
  let d; let m; let y;
  let r = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (r) { d = Number(r[1]); m = Number(r[2]); y = Number(r[3]); } else {
    r = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (!r) return null;
    y = Number(r[1]); m = Number(r[2]); d = Number(r[3]);
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const dois = (n) => String(n).padStart(2, '0');
const dataBR = (dt) => `${dois(dt.getUTCDate())}/${dois(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;

/** Data de hoje no fuso de São Paulo (o servidor roda em UTC). */
function hojeSP(agora = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(agora).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Entrada do formulário (ISO ou BR) -> "dd/mm/aaaa" (como a planilha guarda). Vazio permitido; inválido dá erro. */
function normalizarDataEntrada(valor, rotulo = 'Data') {
  const s = t(valor);
  if (!s) return '';
  const dt = parseData(s);
  if (!dt) throw new ErroValidacao(`${rotulo} inválida.`);
  return dataBR(dt);
}

/** Prazo em dias (1 a 3650). Vazio permitido. */
function normalizarPrazo(valor) {
  const s = t(valor);
  if (!s) return '';
  if (!/^\d{1,4}$/.test(s) || Number(s) < 1 || Number(s) > 3650) {
    throw new ErroValidacao('Prazo da autorização deve ser um número de dias entre 1 e 3650.');
  }
  return String(Number(s));
}

// ── Dinheiro e área ──────────────────────────────────────────────────────────

/** "R$ 1.500.000,00" (ou número) -> reais (número) ou null se vazio/inválido. */
function valorEmReais(valor) {
  const s = t(valor);
  if (!s) return null;
  try { return parseMoedaBR(s) / 100; } catch { return null; }
}

/** Entrada -> "R$ 1.500.000,00" padronizado. Vazio permitido; inválido dá erro. */
function normalizarMoeda(valor, rotulo = 'Valor') {
  const s = t(valor);
  if (!s) return '';
  try { return formatarMoeda(parseMoedaBR(s)); } catch { throw new ErroValidacao(`${rotulo} inválido.`); }
}

/** Entrada -> área padronizada ("21.282,18"). Vazio permitido; inválido dá erro. */
function normalizarArea(valor) {
  const s = t(valor);
  if (!s) return '';
  try { return formatarArea(s); } catch { throw new ErroValidacao('Área inválida.'); }
}

/** Área da planilha -> número (m²) ou null. */
function areaEmM2(valor) {
  const s = t(valor);
  if (!s) return null;
  try { return parseDecimalBR(s, 2) / 100; } catch { return null; }
}

// ── Status ───────────────────────────────────────────────────────────────────

const statusImovelValido = (v) => (STATUS_IMOVEL.includes(t(v)) ? t(v) : '');
const statusClienteValido = (v) => (STATUS_CLIENTE.includes(t(v)) ? t(v) : '');
// Ao SALVAR, um status fora da lista é erro (nos filtros, apenas é ignorado).
function statusExigido(valor, validar, rotulo) {
  const ok = validar(valor);
  if (t(valor) && !ok) throw new ErroValidacao(`Status do ${rotulo} inválido.`);
  return ok;
}
const imovelAtivo = (row) => !STATUS_IMOVEL_ENCERRADOS.includes(t(row['Status Imóvel']));
const clienteAtivo = (row) => !STATUS_CLIENTE_ENCERRADOS.includes(t(row['Status Cliente']));
const clienteComprador = (row) => ['Comprador', 'Ambos'].includes(t(row['Tipo de Cliente']));

// ── Campos novos do imóvel ───────────────────────────────────────────────────

/**
 * Lê do corpo da requisição os campos novos do imóvel e devolve os 6 valores na ordem das colunas
 * [Status Imóvel, Data Autorização, Prazo Autorização (dias), Área (m²), Descrição, Link Pasta Fotos].
 * Campo ausente no corpo: na criação usa o padrão; na edição MANTÉM o valor que já estava na planilha
 * (um formulário antigo, sem esses campos, não apaga nada).
 */
function camposNovosImovel(corpo, original = null) {
  const gestao = corpo?.gestao;
  const imovel = corpo?.imovel ?? {};
  const orig = (cab) => (original ? t(original[cab]) : '');
  const tem = (obj, k) => obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined;

  const status = tem(gestao, 'status') ? statusExigido(gestao.status, statusImovelValido, 'imóvel') : (original ? orig('Status Imóvel') : 'Captação');
  const dataAut = tem(gestao, 'dataAutorizacao') ? normalizarDataEntrada(gestao.dataAutorizacao, 'Data da autorização') : orig('Data Autorização');
  const prazo = tem(gestao, 'prazoDias') ? normalizarPrazo(gestao.prazoDias) : orig('Prazo Autorização (dias)');
  const area = tem(imovel, 'area') ? normalizarArea(imovel.area) : orig('Área (m²)');
  const descricao = tem(imovel, 'descricao') ? textoSeguro(imovel.descricao, 1500) : orig('Descrição');
  const link = tem(imovel, 'linkFotos') ? validarLink(imovel.linkFotos, 'Link da pasta de fotos') : orig('Link Pasta Fotos');
  return [status, dataAut, prazo, area, descricao, link];
}

// ── Campos novos do cliente ──────────────────────────────────────────────────

const listaTexto = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[;,]/)).map((s) => t(s)).filter(Boolean);

/**
 * Devolve os 7 valores na ordem das colunas
 * [Status Cliente, Valor Mínimo, Valor Máximo, Tipo Procurado, Subtipos Procurados, Cidade Procurada, Bairros Procurados].
 * Mesma regra de "ausente = padrão/mantém" do imóvel.
 */
function camposNovosCliente(corpo, original = null) {
  const gestao = corpo?.gestao;
  const perfil = corpo?.perfilBusca;
  const orig = (cab) => (original ? t(original[cab]) : '');
  const tem = (obj, k) => obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined;

  const status = tem(gestao, 'status') ? statusExigido(gestao.status, statusClienteValido, 'cliente') : (original ? orig('Status Cliente') : 'Novo');
  const vMin = tem(perfil, 'valorMinimo') ? normalizarMoeda(perfil.valorMinimo, 'Valor mínimo') : orig('Valor Mínimo');
  const vMax = tem(perfil, 'valorMaximo') ? normalizarMoeda(perfil.valorMaximo, 'Valor máximo') : orig('Valor Máximo');
  const nMin = valorEmReais(vMin);
  const nMax = valorEmReais(vMax);
  if (nMin !== null && nMax !== null && nMin > nMax) throw new ErroValidacao('O valor mínimo não pode ser maior que o máximo.');
  const tipo = tem(perfil, 'tipo') ? (TIPOS_IMOVEL.includes(t(perfil.tipo)) ? t(perfil.tipo) : '') : orig('Tipo Procurado');
  const subtipos = tem(perfil, 'subtipos')
    ? listaTexto(perfil.subtipos).filter((s) => SUBTIPOS_IMOVEL.includes(s)).join(', ')
    : orig('Subtipos Procurados');
  const cidade = tem(perfil, 'cidade') ? textoSeguro(perfil.cidade, 100) : orig('Cidade Procurada');
  const bairros = tem(perfil, 'bairros')
    ? listaTexto(perfil.bairros).slice(0, 20).map((b) => textoSeguro(b, 60)).filter(Boolean).join(', ')
    : orig('Bairros Procurados');
  return [status, vMin, vMax, tipo, subtipos, cidade, bairros];
}

// ── Autorização de venda: vencimento ─────────────────────────────────────────

/**
 * Situação da autorização de um imóvel, ou null quando não se aplica
 * (sem autorização, imóvel vendido/cancelado, ou sem data de início).
 * vencimento = data da autorização + prazo (padrão 120 dias).
 */
function situacaoAutorizacao(row, hoje = hojeSP(), diasAlerta = DIAS_ALERTA_PADRAO) {
  if (t(row['Autorização Venda']) !== 'Sim') return null;
  if (!imovelAtivo(row)) return null;
  const inicio = parseData(row['Data Autorização']);
  if (!inicio) return null;
  const prazo = Number.parseInt(t(row['Prazo Autorização (dias)']), 10);
  const dias = prazo > 0 ? prazo : PRAZO_PADRAO_DIAS;
  const venc = new Date(inicio.getTime() + dias * DIA_MS);
  const diasRestantes = Math.round((venc.getTime() - hoje.getTime()) / DIA_MS);
  const estado = diasRestantes < 0 ? 'vencida' : diasRestantes <= diasAlerta ? 'vencendo' : 'ok';
  return { vencimento: dataBR(venc), diasRestantes, estado };
}

// ── Filtros de listagem ──────────────────────────────────────────────────────

const numeroOuNull = (v) => {
  const s = t(v).replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Filtros do /imoveis: status, tipo (Residencial/Comercial), cidade (contém), valorMin/valorMax (em reais). */
function filtrarImoveis(rows, consulta = {}) {
  const status = statusImovelValido(consulta.status);
  const tipo = TIPOS_IMOVEL.includes(t(consulta.tipo)) ? t(consulta.tipo) : '';
  const cidade = semAcento(consulta.cidade);
  const vMin = numeroOuNull(consulta.valorMin);
  const vMax = numeroOuNull(consulta.valorMax);
  if (!status && !tipo && !cidade && vMin === null && vMax === null) return rows;
  return rows.filter((r) => {
    if (status && t(r['Status Imóvel']) !== status) return false;
    if (tipo && t(r['Tipo']) !== tipo) return false;
    if (cidade && !semAcento(r['Cidade Imóvel']).includes(cidade)) return false;
    if (vMin !== null || vMax !== null) {
      const v = valorEmReais(r['Valor']);
      if (v === null) return false;
      if (vMin !== null && v < vMin) return false;
      if (vMax !== null && v > vMax) return false;
    }
    return true;
  });
}

/** Filtros do /clientes: tipo (inclui Ambos), status, cidade (contém). */
function filtrarClientes(rows, consulta = {}) {
  const tipo = ['Vendedor', 'Comprador', 'Ambos'].includes(t(consulta.tipo)) ? t(consulta.tipo) : '';
  const status = statusClienteValido(consulta.status);
  const cidade = semAcento(consulta.cidade);
  if (!tipo && !status && !cidade) return rows;
  return rows.filter((r) => {
    if (tipo) {
      const aceitos = tipo === 'Ambos' ? ['Ambos'] : [tipo, 'Ambos'];
      if (!aceitos.includes(t(r['Tipo de Cliente']))) return false;
    }
    if (status && t(r['Status Cliente']) !== status) return false;
    if (cidade && !semAcento(r['Cidade']).includes(cidade)) return false;
    return true;
  });
}

// ── Compatibilidade comprador x imóvel ───────────────────────────────────────

const pctFora = (valor, limite) => Math.max(1, Math.round((Math.abs(valor - limite) / limite) * 100));

/**
 * Compara o que o comprador procura com um imóvel.
 * Devolve null (não combina) ou { nivel: 'combina' | 'quase', motivo }.
 *  - Só entram na conta os critérios que o comprador preencheu (tipo, subtipos, cidade, bairros, faixa de valor).
 *  - Tipo, subtipo, cidade e bairro são obrigatórios: se um não bate, não combina.
 *  - Valor fora da faixa por até 10% (ou valor do imóvel não informado) vira "quase".
 *  - Comprador sem nenhum critério não combina com nada (não há o que comparar).
 */
function avaliarCompatibilidade(cliente, imovel) {
  const min = valorEmReais(cliente['Valor Mínimo']);
  const max = valorEmReais(cliente['Valor Máximo']);
  const tipo = semAcento(cliente['Tipo Procurado']);
  const subtipos = listaTexto(cliente['Subtipos Procurados']).map(semAcento);
  const cidade = semAcento(cliente['Cidade Procurada']);
  const bairros = listaTexto(cliente['Bairros Procurados']).map(semAcento);
  const temValor = min !== null || max !== null;
  if (!temValor && !tipo && subtipos.length === 0 && !cidade && bairros.length === 0) return null;

  if (tipo && semAcento(imovel['Tipo']) !== tipo) return null;
  if (subtipos.length) {
    const doImovel = listaTexto(imovel['Subtipo']).map(semAcento);
    if (!doImovel.some((s) => subtipos.includes(s))) return null;
  }
  if (cidade && semAcento(imovel['Cidade Imóvel']) !== cidade) return null;
  if (bairros.length) {
    const b = semAcento(imovel['Bairro Imóvel']);
    if (!b || !bairros.some((x) => b === x || b.includes(x) || x.includes(b))) return null;
  }
  if (!temValor) return { nivel: 'combina', motivo: '' };

  const v = valorEmReais(imovel['Valor']);
  if (v === null) return { nivel: 'quase', motivo: 'Valor do imóvel não informado' };
  if (max !== null && v > max) {
    return v <= max * (1 + TOLERANCIA_VALOR) ? { nivel: 'quase', motivo: `Valor ${pctFora(v, max)}% acima do máximo` } : null;
  }
  if (min !== null && v < min) {
    return v >= min * (1 - TOLERANCIA_VALOR) ? { nivel: 'quase', motivo: `Valor ${pctFora(v, min)}% abaixo do mínimo` } : null;
  }
  return { nivel: 'combina', motivo: '' };
}

const ordemNivel = { combina: 0, quase: 1 };
const porNivelEId = (a, b) => (ordemNivel[a.nivel] - ordemNivel[b.nivel]) || String(a.id).localeCompare(String(b.id));

/** Imóveis ativos que combinam com o comprador (resumo, sem dados do vendedor). */
function imoveisCompativeis(cliente, imoveis) {
  return imoveis
    .filter(imovelAtivo)
    .map((im) => ({ im, r: avaliarCompatibilidade(cliente, im) }))
    .filter((x) => x.r)
    .map(({ im, r }) => ({
      id: t(im['ID']), tipo: t(im['Tipo']), subtipo: t(im['Subtipo']),
      bairro: t(im['Bairro Imóvel']), cidade: t(im['Cidade Imóvel']), uf: t(im['UF Imóvel']),
      valor: t(im['Valor']), status: t(im['Status Imóvel']),
      nivel: r.nivel, motivo: r.motivo,
    }))
    .sort(porNivelEId);
}

/** Compradores ativos que combinam com o imóvel (resumo). */
function clientesCompativeis(imovel, clientes) {
  if (!imovelAtivo(imovel)) return [];
  return clientes
    .filter((c) => clienteComprador(c) && clienteAtivo(c))
    .map((c) => ({ c, r: avaliarCompatibilidade(c, imovel) }))
    .filter((x) => x.r)
    .map(({ c, r }) => ({
      id: t(c['ID']), nome: t(c['Nome']), telefone: t(c['Telefone']), status: t(c['Status Cliente']),
      nivel: r.nivel, motivo: r.motivo,
    }))
    .sort(porNivelEId);
}

module.exports = {
  STATUS_IMOVEL, STATUS_IMOVEL_ENCERRADOS, STATUS_CLIENTE, STATUS_CLIENTE_ENCERRADOS, TIPOS_IMOVEL, SUBTIPOS_IMOVEL,
  PRAZO_PADRAO_DIAS, DIAS_ALERTA_PADRAO, TOLERANCIA_VALOR,
  ErroValidacao, textoSeguro, validarLink,
  parseData, dataBR, hojeSP, normalizarDataEntrada, normalizarPrazo,
  valorEmReais, normalizarMoeda, normalizarArea, areaEmM2,
  statusImovelValido, statusClienteValido, imovelAtivo, clienteAtivo, clienteComprador,
  camposNovosImovel, camposNovosCliente, situacaoAutorizacao,
  filtrarImoveis, filtrarClientes, avaliarCompatibilidade, imoveisCompativeis, clientesCompativeis,
};
