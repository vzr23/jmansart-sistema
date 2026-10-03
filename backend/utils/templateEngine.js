'use strict';
/**
 * Motor do modelo de contrato (sintaxe da PARTE A do modelo-autorizacao-venda.md).
 *
 *  {{variavel}}                       valor do contexto (ou do proprietário, dentro de "cada")
 *  {{NOME}}                           nome do proprietário em MAIÚSCULAS (só dentro de "cada")
 *  {{PL:singular|plural}}             1 proprietário = singular; 2 ou mais = plural
 *  {{G:o|a}}                          gênero do proprietário corrente (M = 1ª opção, F = 2ª); só dentro de "cada"
 *  {{#cada proprietarios [separador="; "]}} ... {{/cada}}
 *  {{#se variavel = valor}} ... {{/se}}     (também aceita !=)
 *
 * Variável ausente (undefined/null) gera erro: o contrato nunca sai com lacuna silenciosa.
 * String vazia é permitida (campos opcionais, ex.: orgao_emissor).
 * Funções puras, sem I/O.
 */

class TemplateError extends Error {
  constructor(msg) { super(msg); this.name = 'TemplateError'; }
}

const TOKEN = /\{\{([^{}]+)\}\}/g;
const NOME_VAR = /^[A-Za-z_][A-Za-z0-9_]*$/;

// ── Parser: texto -> árvore ───────────────────────────────────────────────
function parse(texto) {
  const raiz = { tipo: 'raiz', filhos: [] };
  const pilha = [raiz];
  let ultimo = 0;
  let m;
  TOKEN.lastIndex = 0;

  const atual = () => pilha[pilha.length - 1];

  while ((m = TOKEN.exec(texto)) !== null) {
    if (m.index > ultimo) atual().filhos.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) });
    ultimo = m.index + m[0].length;
    const tag = m[1].trim();
    let r;

    if ((r = tag.match(/^#cada\s+(\w+)(?:\s+separador="([^"]*)")?$/))) {
      if (r[1] !== 'proprietarios') throw new TemplateError(`"cada" só aceita "proprietarios" (recebeu "${r[1]}")`);
      const no = { tipo: 'cada', separador: r[2] ?? '', filhos: [] };
      atual().filhos.push(no);
      pilha.push(no);
    } else if (tag === '/cada') {
      if (atual().tipo !== 'cada') throw new TemplateError('"{{/cada}}" sem abertura correspondente');
      pilha.pop();
    } else if ((r = tag.match(/^#se\s+(\w+)\s*(=|!=)\s*(.+)$/))) {
      const no = { tipo: 'se', variavel: r[1], op: r[2], valor: r[3].trim(), filhos: [] };
      atual().filhos.push(no);
      pilha.push(no);
    } else if (tag === '/se') {
      if (atual().tipo !== 'se') throw new TemplateError('"{{/se}}" sem abertura correspondente');
      pilha.pop();
    } else if ((r = tag.match(/^(PL|G):(.*)$/s))) {
      const opcoes = r[2].split('|');
      if (opcoes.length !== 2) throw new TemplateError(`"${r[1]}:" precisa de exatamente 2 opções separadas por "|": {{${tag}}}`);
      atual().filhos.push({ tipo: r[1] === 'PL' ? 'pl' : 'g', opcoes });
    } else if (NOME_VAR.test(tag)) {
      atual().filhos.push({ tipo: 'var', nome: tag });
    } else {
      throw new TemplateError(`Marcador não reconhecido: {{${tag}}}`);
    }
  }
  if (ultimo < texto.length) atual().filhos.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  if (pilha.length > 1) throw new TemplateError(`Bloco "${pilha[pilha.length - 1].tipo}" não foi fechado`);
  return raiz;
}

// ── Renderização ──────────────────────────────────────────────────────────
function valorDe(nome, ctx, prop) {
  if (nome === 'NOME') {
    if (!prop) throw new TemplateError('{{NOME}} só pode ser usado dentro de {{#cada proprietarios}}');
    if (prop.nome == null) throw new TemplateError('Proprietário sem "nome"');
    return String(prop.nome).toUpperCase();
  }
  let v;
  if (prop && Object.prototype.hasOwnProperty.call(prop, nome)) v = prop[nome];
  else v = ctx[nome];
  if (v === undefined || v === null) {
    throw new TemplateError(`Variável ausente: ${nome}${prop ? ' (proprietário)' : ''}`);
  }
  return String(v);
}

function renderizar(filhos, ctx, prop) {
  let out = '';
  for (const no of filhos) {
    switch (no.tipo) {
      case 'texto': out += no.valor; break;
      case 'var': out += valorDe(no.nome, ctx, prop); break;
      case 'pl': out += ctx.proprietarios.length === 1 ? no.opcoes[0] : no.opcoes[1]; break;
      case 'g': {
        if (!prop) throw new TemplateError('{{G:...}} só pode ser usado dentro de {{#cada proprietarios}}');
        const g = String(prop.genero ?? '').toUpperCase();
        if (g !== 'M' && g !== 'F') throw new TemplateError(`Gênero inválido para "${prop.nome ?? '?'}" (use M ou F)`);
        out += g === 'M' ? no.opcoes[0] : no.opcoes[1];
        break;
      }
      case 'cada':
        out += ctx.proprietarios.map((p) => renderizar(no.filhos, ctx, p)).join(no.separador);
        break;
      case 'se': {
        const igual = valorDe(no.variavel, ctx, prop).trim() === no.valor;
        if (no.op === '=' ? igual : !igual) out += renderizar(no.filhos, ctx, prop);
        break;
      }
      default: throw new TemplateError(`Nó desconhecido: ${no.tipo}`);
    }
  }
  return out;
}

/** Limpa espaços deixados por campos opcionais vazios (ex.: "RG 123 , inscrito" -> "RG 123, inscrito"). */
function normalizarEspacos(texto) {
  return texto
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,;.])/g, '$1')
    .replace(/[ \t]+$/gm, '');
}

/**
 * @param {string} texto     modelo com marcadores
 * @param {object} contexto  { proprietarios: [{nome, genero, ...}], ...variaveis }
 * @returns {string} texto final (mantém **negrito** em markdown para o gerador de PDF)
 */
function renderTemplate(texto, contexto) {
  if (!contexto || !Array.isArray(contexto.proprietarios) || contexto.proprietarios.length < 1) {
    throw new TemplateError('É necessário ao menos 1 proprietário');
  }
  return normalizarEspacos(renderizar(parse(texto).filhos, contexto, null));
}

module.exports = { renderTemplate, TemplateError };
