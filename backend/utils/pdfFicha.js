'use strict';
/**
 * Ficha do imóvel em PDF (para enviar ao comprador). Gerada EM MEMÓRIA, nada vai para disco.
 * Só entram dados comerciais: tipo, localização (bairro e cidade — SEM rua/número), valor, área,
 * condições de pagamento, descrição e link das fotos. NUNCA entram dados do vendedor, IPTU,
 * matrícula, saldo devedor ou observações internas.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const imobiliaria = require('../config/imobiliaria');

const PASTA_FONTES = path.join(__dirname, '..', 'fonts');
const FONTES = {
  Serif: 'LiberationSerif-Regular.ttf',
  'Serif-Bold': 'LiberationSerif-Bold.ttf',
  'Serif-Italic': 'LiberationSerif-Italic.ttf',
};
for (const arquivo of Object.values(FONTES)) {
  if (!fs.existsSync(path.join(PASTA_FONTES, arquivo))) throw new Error(`Fonte ausente: backend/fonts/${arquivo}`);
}

const NAVY = '#1f2a44';
const CINZA = '#555555';
const MARGEM = 56;

const t = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();

function formatarValor(v) {
  const s = t(v);
  if (!s) return '';
  return /^R\$/i.test(s) ? s : `R$ ${s}`;
}
function formatarArea(v) {
  const s = t(v);
  return s ? `${s} m²` : '';
}

/**
 * @param {object} d { id, tipo, subtipo, bairro, cidade, uf, valor, area, condicoesPagamento, descricao, linkFotos }
 * @returns {Promise<Buffer>}
 */
function gerarPdfFicha(d) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGEM, bottom: MARGEM, left: MARGEM, right: MARGEM },
      info: { Title: `Ficha do imóvel ${t(d.id)}`, Author: 'J.Mansart', Creator: 'J.Mansart Sistema' },
    });
    for (const [nome, arq] of Object.entries(FONTES)) doc.registerFont(nome, path.join(PASTA_FONTES, arq));
    const partes = [];
    doc.on('data', (c) => partes.push(c));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    try {
      const W = doc.page.width;
      const largura = W - MARGEM * 2;

      // Cabeçalho
      doc.rect(0, 0, W, 92).fill(NAVY);
      doc.fillColor('#ffffff').font('Serif-Bold').fontSize(26).text('J.MANSART', MARGEM, 30, { characterSpacing: 3 });
      doc.font('Serif').fontSize(11).text('Negócios Imobiliários', MARGEM, 62);
      doc.font('Serif').fontSize(10).text(`Ref. ${t(d.id)}`, MARGEM, 36, { width: largura, align: 'right' });

      let y = 120;
      doc.fillColor(NAVY).font('Serif-Bold').fontSize(20);
      const titulo = [t(d.subtipo) || t(d.tipo) || 'Imóvel'].join('');
      doc.text(titulo, MARGEM, y, { width: largura });
      y = doc.y + 2;

      const local = [t(d.bairro), [t(d.cidade), t(d.uf)].filter(Boolean).join('/')].filter(Boolean).join(' · ');
      if (local) {
        doc.fillColor(CINZA).font('Serif').fontSize(13).text(local, MARGEM, y, { width: largura });
        y = doc.y + 14;
      }

      const valor = formatarValor(d.valor);
      if (valor) {
        doc.fillColor(CINZA).font('Serif').fontSize(10).text('VALOR', MARGEM, y);
        doc.fillColor(NAVY).font('Serif-Bold').fontSize(30).text(valor, MARGEM, doc.y, { width: largura });
        y = doc.y + 10;
      }

      doc.moveTo(MARGEM, y).lineTo(W - MARGEM, y).lineWidth(0.8).strokeColor('#c8ccd6').stroke();
      y += 14;

      const bloco = (rotulo, texto) => {
        if (!texto) return;
        doc.fillColor(CINZA).font('Serif').fontSize(10).text(rotulo.toUpperCase(), MARGEM, y, { width: largura });
        doc.fillColor('#111111').font('Serif').fontSize(12.5).text(texto, MARGEM, doc.y + 1, { width: largura, lineGap: 2.5 });
        y = doc.y + 12;
      };

      bloco('Tipo', [t(d.tipo), t(d.subtipo)].filter(Boolean).join(' · '));
      bloco('Área', formatarArea(d.area));
      bloco('Condições de pagamento', t(d.condicoesPagamento));
      bloco('Sobre o imóvel', t(d.descricao));

      const link = t(d.linkFotos);
      if (/^https?:\/\//i.test(link)) {
        doc.fillColor(CINZA).font('Serif').fontSize(10).text('FOTOS E DOCUMENTOS', MARGEM, y);
        doc.fillColor('#1a56db').font('Serif').fontSize(12).text('Abrir pasta de fotos', MARGEM, doc.y + 1, {
          width: largura, link, underline: true,
        });
        y = doc.y + 12;
      }

      // Rodapé
      const rodapeY = doc.page.height - MARGEM - 38;
      doc.moveTo(MARGEM, rodapeY).lineTo(W - MARGEM, rodapeY).lineWidth(0.6).strokeColor('#c8ccd6').stroke();
      doc.fillColor(CINZA).font('Serif').fontSize(9.5);
      doc.text(`${imobiliaria.imob_razao_social} · ${imobiliaria.imob_creci} · CNPJ ${imobiliaria.imob_cnpj}`,
        MARGEM, rodapeY + 6, { width: largura, align: 'center', lineBreak: false });
      doc.font('Serif-Italic').fontSize(8.5).text(
        'Informações sujeitas a alteração sem aviso prévio. O endereço completo é informado no atendimento.',
        MARGEM, rodapeY + 22, { width: largura, align: 'center', lineBreak: false });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { gerarPdfFicha };
