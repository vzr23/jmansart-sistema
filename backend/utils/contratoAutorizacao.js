'use strict';
/**
 * Monta e valida os dados do contrato "Autorização para Venda" e gera o texto final.
 * O modelo fica no servidor (templates/), nunca em pasta pública. Nada é gravado em disco.
 *
 * Entrada (nomes das variáveis = dicionário do modelo-autorizacao-venda.md):
 * {
 *   proprietarios: [{ nome, genero:'M'|'F', nacionalidade, profissao, estado_civil, cpf,
 *                     rua, numero, bairro, cidade, uf, cep }],
 *   imovel:   { matricula, comarca, tipo_imovel, area_m2, logradouro_imovel, bairro_imovel, municipio_imovel, uf_imovel },
 *   condicoes:{ valor, comissao_pct=6, prazo_dias=120, multa_pct=2, juros_pct_mes=1,
 *               cidade_assinatura, data_assinatura? (padrão: hoje, fuso America/Sao_Paulo) }
 * }
 * Exclusividade é fixa em "não" por ora (nota 3 do modelo).
 */
const fs = require('fs');
const path = require('path');
const IMOBILIARIA = require('../config/imobiliaria');
const { renderTemplate } = require('./templateEngine');
const { numeroPorExtenso, moedaPorExtenso, percentualPorExtenso, dataPorExtenso } = require('./extenso');
const F = require('./formatadores');

const MAX_PROPRIETARIOS = 10;
const DEFAULTS = Object.freeze({ comissao_pct: 6, prazo_dias: 120, multa_pct: 2, juros_pct_mes: 1 });
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'autorizacao-venda.md');

class ContratoValidationError extends Error {
  constructor(erros) {
    super(`Dados inválidos: ${erros.map((e) => `${e.campo} (${e.mensagem})`).join('; ')}`);
    this.name = 'ContratoValidationError';
    this.erros = erros;
  }
}

let templateCache = null;
const carregarTemplate = () => (templateCache ??= fs.readFileSync(TEMPLATE_PATH, 'utf8'));

/** Remove caracteres de controle, "*" (marcador de negrito) e chaves; normaliza espaços. */
function limpa(valor, max = 200) {
  if (valor === undefined || valor === null) return '';
  return String(valor).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[*{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()); // YYYY-MM-DD
}

function montarContexto(entrada) {
  const erros = [];
  const avisos = [];
  const erro = (campo, mensagem) => erros.push({ campo, mensagem });
  const texto = (obj, chave, campo, { obrigatorio = true, max = 200 } = {}) => {
    const v = limpa(obj?.[chave], max);
    if (!v && obrigatorio) erro(campo, 'obrigatório');
    return v;
  };
  const uf = (obj, chave, campo) => {
    const v = limpa(obj?.[chave], 2).toUpperCase();
    if (!/^[A-Z]{2}$/.test(v)) erro(campo, 'UF deve ter 2 letras');
    return v;
  };
  const tentar = (campo, fn) => {
    try { return fn(); } catch (e) { erro(campo, e instanceof RangeError ? e.message : 'valor inválido'); return ''; }
  };

  // ── Proprietários ──────────────────────────────────────────────
  const lista = Array.isArray(entrada?.proprietarios) ? entrada.proprietarios : [];
  if (lista.length < 1) erro('proprietarios', 'informe ao menos 1 proprietário');
  if (lista.length > MAX_PROPRIETARIOS) erro('proprietarios', `máximo de ${MAX_PROPRIETARIOS} proprietários`);
  const proprietarios = lista.slice(0, MAX_PROPRIETARIOS).map((p, i) => {
    const c = (k) => `proprietarios[${i}].${k}`;
    const genero = limpa(p?.genero, 1).toUpperCase();
    if (genero !== 'M' && genero !== 'F') erro(c('genero'), 'use M ou F');
    const cpfBruto = limpa(p?.cpf, 20);
    const cpf = tentar(c('cpf'), () => F.formatarCpf(cpfBruto));
    if (cpf && !F.cpfDigitosValidos(cpf)) avisos.push({ campo: c('cpf'), mensagem: 'CPF com dígitos verificadores inválidos (confira a digitação)' });
    return {
      nome: texto(p, 'nome', c('nome')),
      genero,
      nacionalidade: texto(p, 'nacionalidade', c('nacionalidade'), { max: 60 }),
      profissao: texto(p, 'profissao', c('profissao'), { max: 80 }),
      estado_civil: texto(p, 'estado_civil', c('estado_civil'), { max: 120 }),
      cpf,
      rua: texto(p, 'rua', c('rua')),
      numero: texto(p, 'numero', c('numero'), { max: 20 }),
      bairro: texto(p, 'bairro', c('bairro'), { max: 100 }),
      cidade: texto(p, 'cidade', c('cidade'), { max: 100 }),
      uf: uf(p, 'uf', c('uf')),
      cep: tentar(c('cep'), () => F.formatarCep(limpa(p?.cep, 12))),
    };
  });

  // ── Imóvel ─────────────────────────────────────────────────────
  const im = entrada?.imovel;
  const imovel = {
    matricula: texto(im, 'matricula', 'imovel.matricula', { max: 40 }),
    comarca: texto(im, 'comarca', 'imovel.comarca', { max: 100 }),
    tipo_imovel: texto(im, 'tipo_imovel', 'imovel.tipo_imovel', { max: 60 }),
    area_m2: tentar('imovel.area_m2', () => F.formatarArea(limpa(im?.area_m2, 20))),
    logradouro_imovel: texto(im, 'logradouro_imovel', 'imovel.logradouro_imovel', { max: 250 }),
    bairro_imovel: texto(im, 'bairro_imovel', 'imovel.bairro_imovel', { max: 100 }),
    municipio_imovel: texto(im, 'municipio_imovel', 'imovel.municipio_imovel', { max: 100 }),
    uf_imovel: uf(im, 'uf_imovel', 'imovel.uf_imovel'),
  };

  // ── Condições do negócio ───────────────────────────────────────
  const co = entrada?.condicoes ?? {};
  const vazio = (v) => v === undefined || v === null || String(v).trim() === '';

  if (!vazio(co.exclusividade) && limpa(co.exclusividade).toLowerCase() !== 'nao' && limpa(co.exclusividade).toLowerCase() !== 'não') {
    erro('condicoes.exclusividade', 'apenas "não exclusividade" está disponível por enquanto');
  }

  let valor = '';
  let valorExtenso = '';
  tentar('condicoes.valor', () => {
    const centavos = F.parseMoedaBR(limpa(co.valor, 30));
    if (centavos <= 0) throw new RangeError('deve ser maior que zero');
    valor = F.formatarMoeda(centavos);
    valorExtenso = moedaPorExtenso(centavos);
  });

  const percentual = (chave, { permiteZero }) => {
    const campo = `condicoes.${chave}`;
    const bruto = vazio(co[chave]) ? DEFAULTS[chave] : limpa(co[chave], 10);
    let fmt = '';
    let ext = '';
    tentar(campo, () => {
      const centesimos = F.parseDecimalBR(bruto, 2);
      if (centesimos > 10000) throw new RangeError('não pode passar de 100%');
      if (!permiteZero && centesimos === 0) throw new RangeError('deve ser maior que zero');
      fmt = F.formatarPercentual(bruto);
      ext = percentualPorExtenso(fmt);
    });
    return [fmt, ext];
  };
  const [comissao_pct, comissao_extenso] = percentual('comissao_pct', { permiteZero: false });
  const [multa_pct, multa_extenso] = percentual('multa_pct', { permiteZero: true });
  const [juros_pct_mes, juros_extenso] = percentual('juros_pct_mes', { permiteZero: true });

  let prazo_dias = '';
  let prazo_extenso = '';
  const prazoBruto = vazio(co.prazo_dias) ? DEFAULTS.prazo_dias : Number(limpa(co.prazo_dias, 6));
  if (Number.isInteger(prazoBruto) && prazoBruto >= 1 && prazoBruto <= 3650) {
    prazo_dias = String(prazoBruto);
    prazo_extenso = numeroPorExtenso(prazoBruto);
  } else {
    erro('condicoes.prazo_dias', 'informe um número inteiro de dias entre 1 e 3650');
  }

  const data_assinatura = tentar('condicoes.data_assinatura', () =>
    dataPorExtenso(vazio(co.data_assinatura) ? hojeSaoPaulo() : limpa(co.data_assinatura, 12)));
  const cidade_assinatura = texto(co, 'cidade_assinatura', 'condicoes.cidade_assinatura', { max: 100 });

  if (erros.length) throw new ContratoValidationError(erros);

  return {
    contexto: {
      proprietarios,
      ...imovel,
      valor, valor_extenso: valorExtenso,
      comissao_pct, comissao_extenso,
      prazo_dias, prazo_extenso,
      exclusividade: 'nao',
      multa_pct, multa_extenso,
      juros_pct_mes, juros_extenso,
      cidade_assinatura, data_assinatura,
      ...IMOBILIARIA,
    },
    avisos,
  };
}

/** Valida, calcula e renderiza o texto final. Retorna { texto, avisos } (avisos não bloqueiam). */
function gerarTextoAutorizacaoVenda(entrada) {
  const { contexto, avisos } = montarContexto(entrada);
  return { texto: renderTemplate(carregarTemplate(), contexto), avisos };
}

module.exports = { montarContexto, gerarTextoAutorizacaoVenda, ContratoValidationError, DEFAULTS, MAX_PROPRIETARIOS };
