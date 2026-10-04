'use strict';
/**
 * Converte o texto final do contrato (markdown simples: "# título", parágrafos, **negrito**,
 * linha de "____" = linha de assinatura) em PDF A4. Gera tudo EM MEMÓRIA (Buffer): nada vai para disco.
 *
 * Fonte: Liberation Serif embutida no PDF (backend/fonts, licença SIL OFL) — o "²", as aspas e os acentos
 * saem iguais em qualquer leitor, sem depender de fontes do aparelho.
 *
 * Regras de layout:
 *  - Parágrafo que cabe em uma página nunca é quebrado no meio (evita sobreposição com trechos em negrito).
 *  - Fecho (data + assinaturas + compromisso do corretor) fica junto, na mesma página, quando cabe em uma página.
 *    Se não couber (muitos proprietários), quebra apenas ENTRE blocos: um bloco de assinatura nunca é dividido.
 *
 * Marca "MINUTA": ligada por padrão enquanto o texto jurídico não for aprovado.
 * Desligar com a variável de ambiente CONTRATO_MARCA_MINUTA=false.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const PASTA_FONTES = path.join(__dirname, '..', 'fonts');
const FONTE = { normal: 'Serif', bold: 'Serif-Bold', italic: 'Serif-Italic' };
const ARQUIVOS_FONTE = {
  [FONTE.normal]: 'LiberationSerif-Regular.ttf',
  [FONTE.bold]: 'LiberationSerif-Bold.ttf',
  [FONTE.italic]: 'LiberationSerif-Italic.ttf',
};
for (const arquivo of Object.values(ARQUIVOS_FONTE)) {
  if (!fs.existsSync(path.join(PASTA_FONTES, arquivo))) {
    throw new Error(`Fonte ausente: backend/fonts/${arquivo}`);
  }
}

const MARGENS = { top: 72, bottom: 72, left: 72, right: 72 };
const TAMANHO = 11;
const ENTRELINHA = 2.5;
const RECUO_SUBCLAUSULA = 22;
const FOLGA = 6; // pontos de segurança nas medições de altura

const marcaMinutaAtiva = () => String(process.env.CONTRATO_MARCA_MINUTA ?? 'true').trim().toLowerCase() !== 'false';

function segmentos(texto) {
  const partes = [];
  const re = /\*\*(.+?)\*\*/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push({ t: texto.slice(ultimo, m.index), b: false });
    partes.push({ t: m[1], b: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ t: texto.slice(ultimo), b: false });
  // pdfkit descarta espaços no INÍCIO de um trecho "continued": move-os para o fim do trecho anterior.
  for (let i = 1; i < partes.length; i++) {
    const m2 = partes[i].t.match(/^\s+/);
    if (m2) { partes[i - 1].t += m2[0]; partes[i].t = partes[i].t.slice(m2[0].length); }
  }
  return partes.filter((p) => p.t.length > 0);
}

const semMarcas = (s) => s.replace(/\*\*/g, '');

function classificar(par) {
  if (/^#\s/.test(par)) return 'titulo';
  if (/^_{5,}/.test(par)) return 'assinatura';
  if (/^\*\*\d+\.\d+\.\*\*/.test(par)) return 'subclausula';
  if (!par.includes('\n') && !par.includes('**') && par.length < 100) return 'linhaCurta';
  return 'texto';
}

function desenharMarcaDagua(doc, estado) {
  const { x, y } = doc;
  const w = doc.page.width;
  const h = doc.page.height;
  doc.save();
  doc.rotate(-45, { origin: [w / 2, h / 2] });
  doc.fillColor('#000000').fillOpacity(0.07).font(FONTE.bold).fontSize(110);
  const larguraTexto = doc.widthOfString('MINUTA');
  doc.text('MINUTA', (w - larguraTexto) / 2, h / 2 - 55, { lineBreak: false });
  doc.restore();
  // save/restore não devolve fonte/tamanho/cor do texto: sem isto, o texto que continua na nova página sai em 110pt.
  doc.font(estado.fonte).fontSize(estado.tamanho).fillColor('#000000').fillOpacity(1);
  doc.x = x;
  doc.y = y;
}

/**
 * @param {string} texto  texto final já renderizado
 * @param {{minuta?: boolean, relatorio?: object}} [opcoes]
 *        minuta: força ligar/desligar a marca (padrão: variável de ambiente)
 *        relatorio: objeto opcional preenchido com informações de layout (usado nos testes):
 *                   { paginas, assinaturas: [{paginaInicio, paginaFim}], fecho: {paginaInicio, paginaFim} | null }
 * @returns {Promise<Buffer>}
 */
function gerarPdfContrato(texto, opcoes = {}) {
  const minuta = opcoes.minuta ?? marcaMinutaAtiva();
  const relatorio = opcoes.relatorio;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: MARGENS,
      bufferPages: true,
      info: { Title: 'Autorização para Venda de Imóvel', Author: 'J.Mansart', Creator: 'J.Mansart Sistema' },
    });
    for (const [nome, arquivo] of Object.entries(ARQUIVOS_FONTE)) doc.registerFont(nome, path.join(PASTA_FONTES, arquivo));

    const partes = [];
    doc.on('data', (c) => partes.push(c));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    try {
      const larguraUtil = doc.page.width - MARGENS.left - MARGENS.right;
      const alturaUtilPagina = doc.page.height - MARGENS.top - MARGENS.bottom;
      const limiteInferior = () => doc.page.height - doc.page.margins.bottom;
      const paginaAtual = () => doc.bufferedPageRange().count;

      const estado = { fonte: FONTE.normal, tamanho: TAMANHO };
      const usarFonte = (fonte, tamanho) => {
        estado.fonte = fonte;
        estado.tamanho = tamanho;
        doc.font(fonte).fontSize(tamanho);
      };

      if (minuta) {
        desenharMarcaDagua(doc, estado);
        doc.on('pageAdded', () => desenharMarcaDagua(doc, estado));
      }

      usarFonte(FONTE.normal, TAMANHO);
      const alturaLinha = doc.currentLineHeight(true); // 1 linha de texto, sem a entrelinha extra
      const garantirEspaco = (altura) => { if (doc.y + altura > limiteInferior()) doc.addPage(); };

      // ── Medições (todas com a fonte normal; FOLGA cobre o negrito, que é um pouco mais largo) ──
      const opcoesTexto = (alinhamento, recuo = 0) => ({ align: alinhamento, width: larguraUtil - recuo, lineGap: ENTRELINHA });
      const alturaTexto = (par, alinhamento, recuo = 0) => {
        usarFonte(FONTE.normal, TAMANHO);
        return doc.heightOfString(semMarcas(par), opcoesTexto(alinhamento, recuo)) + alturaLinha;
      };
      // Respiros do fecho, em "linhas de texto": antes da data, antes de cada traço (espaço para assinar) e depois de cada bloco.
      const ESPACO_ANTES_DATA = 1.6;
      const ESPACO_ANTES_ASSINATURA = 2.6;
      const ESPACO_APOS_ASSINATURA = 0.9;
      const linhasAssinatura = (par) => par.split('\n').map((l) => l.trim()).filter(Boolean);
      const alturaAssinatura = (par) => {
        const n = linhasAssinatura(par).length - 1; // linhas de texto abaixo do traço
        return ESPACO_ANTES_ASSINATURA * alturaLinha + 4 + n * (alturaLinha + ENTRELINHA) + ESPACO_APOS_ASSINATURA * alturaLinha + FOLGA;
      };

      // ── Escrita ───────────────────────────────────────────────────
      const escreverTexto = (par, { alinhamento, recuo = 0 }) => {
        const segs = segmentos(par);
        const o = opcoesTexto(alinhamento, recuo);
        // Parágrafo que cabe numa página mas não no espaço restante vai inteiro para a próxima.
        const altura = alturaTexto(par, alinhamento, recuo);
        if (doc.y + altura > limiteInferior() && altura < alturaUtilPagina) doc.addPage();
        doc.x = MARGENS.left + recuo;
        segs.forEach((s, i) => {
          usarFonte(s.b ? FONTE.bold : FONTE.normal, TAMANHO);
          doc.text(s.t, { ...o, continued: i < segs.length - 1 });
        });
        doc.x = MARGENS.left;
      };

      const escreverAssinatura = (par) => {
        const linhas = linhasAssinatura(par);
        garantirEspaco(alturaAssinatura(par)); // o bloco nunca é dividido entre páginas
        usarFonte(FONTE.normal, TAMANHO);
        doc.moveDown(ESPACO_ANTES_ASSINATURA);
        const paginaInicio = paginaAtual();
        const yLinha = doc.y;
        doc.moveTo(MARGENS.left, yLinha).lineTo(MARGENS.left + 240, yLinha).lineWidth(0.7).strokeColor('#000000').stroke();
        doc.y = yLinha + 4;
        linhas.slice(1).forEach((l) => escreverTexto(l, { alinhamento: 'left' }));
        usarFonte(FONTE.normal, TAMANHO);
        doc.moveDown(ESPACO_APOS_ASSINATURA);
        relatorio?.assinaturas.push({ paginaInicio, paginaFim: paginaAtual() });
      };

      const escreverItem = (item) => {
        switch (item.tipo) {
          case 'titulo':
            usarFonte(FONTE.bold, 14);
            doc.text(item.par.replace(/^#\s+/, ''), { align: 'center' });
            doc.moveDown(1.2);
            break;
          case 'assinatura':
            escreverAssinatura(item.par);
            break;
          case 'linhaCurta':
            usarFonte(FONTE.normal, TAMANHO);
            doc.moveDown(ESPACO_ANTES_DATA);
            escreverTexto(item.par, { alinhamento: 'left' });
            break;
          default: {
            const sub = item.tipo === 'subclausula';
            escreverTexto(item.par, { alinhamento: 'justify', recuo: sub ? RECUO_SUBCLAUSULA : 0 });
            usarFonte(FONTE.normal, TAMANHO);
            doc.moveDown(0.7);
          }
        }
      };

      const alturaItem = (item) => {
        if (item.tipo === 'assinatura') return alturaAssinatura(item.par);
        if (item.tipo === 'linhaCurta') return ESPACO_ANTES_DATA * alturaLinha + alturaTexto(item.par, 'left');
        return alturaTexto(item.par, 'justify') + 0.7 * alturaLinha;
      };

      // ── Monta a lista de blocos ───────────────────────────────────
      const itens = texto.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        .map((par) => ({ par, tipo: classificar(par) }));

      // Fecho = da linha da data (curta, seguida de assinatura) até o fim do documento.
      let inicioFecho = itens.findIndex((it, i) => it.tipo === 'linhaCurta' && itens[i + 1]?.tipo === 'assinatura');
      if (inicioFecho === -1) inicioFecho = itens.findIndex((it) => it.tipo === 'assinatura');

      if (relatorio) { relatorio.assinaturas = []; relatorio.fecho = null; }

      itens.slice(0, inicioFecho === -1 ? itens.length : inicioFecho).forEach(escreverItem);

      if (inicioFecho !== -1) {
        const fecho = itens.slice(inicioFecho);
        const total = fecho.reduce((soma, it) => soma + alturaItem(it), 0) + FOLGA;
        if (total < alturaUtilPagina) {
          garantirEspaco(total); // cabe em uma página: o fecho inteiro vai junto
        } else {
          // Não cabe em uma página: mantém a data junto da primeira assinatura e quebra só entre blocos.
          garantirEspaco(alturaItem(fecho[0]) + (fecho[1] ? alturaAssinatura(fecho[1].par) : 0));
        }
        const paginaInicioFecho = paginaAtual();
        fecho.forEach(escreverItem);
        if (relatorio) relatorio.fecho = { paginaInicio: paginaInicioFecho, paginaFim: paginaAtual() };
      }

      // Rodapé com paginação (após o conteúdo, para saber o total de páginas).
      const { start, count } = doc.bufferedPageRange();
      for (let i = start; i < start + count; i++) {
        doc.switchToPage(i);
        const margemOriginal = doc.page.margins.bottom;
        doc.page.margins.bottom = 0; // evita que escrever no rodapé crie nova página
        const rodape = `J.Mansart · Autorização para Venda · Página ${i - start + 1} de ${count}${minuta ? ' · MINUTA sujeita a revisão jurídica' : ''}`;
        doc.font(FONTE.normal).fontSize(8).fillColor('#666666').fillOpacity(1)
          .text(rodape, MARGENS.left, doc.page.height - 45, { width: larguraUtil, align: 'center', lineBreak: false });
        doc.page.margins.bottom = margemOriginal;
      }
      if (relatorio) relatorio.paginas = count;
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { gerarPdfContrato, marcaMinutaAtiva };
