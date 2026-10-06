'use strict';
/**
 * Rotas do mini CRM (todas atrás do JWT): alertas de autorização, compatibilidade comprador x imóvel
 * e ficha do imóvel em PDF. Nada é salvo: tudo é calculado na hora a partir da planilha.
 *
 *   GET /alertas/autorizacoes?dias=15
 *   GET /clientes/:id/imoveis-compativeis
 *   GET /imoveis/:id/clientes-compativeis
 *   GET /imoveis/:id/ficha        (PDF, só bairro/cidade, sem dados do vendedor)
 */
const express = require('express');
const SEG = require('../config/seguranca');
const { LimitadorTentativas } = require('../utils/limitador');
const crm = require('../utils/crm');
const { gerarPdfFicha } = require('../utils/pdfFicha');

const ID_VALIDO = /^[A-Za-z0-9-]{3,30}$/;
const MAX_VENCIDAS = 50;
const t = (v) => String(v ?? '').trim();
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const buscarImoveisPlanilha = () => { const s = require('../sheets'); return s.getRows(s.IMOVEIS_SHEET); };
const buscarClientesPlanilha = () => { const s = require('../sheets'); return s.getRows(s.CLIENTES_SHEET); };

function criarRotasCrm({
  buscarImoveis = buscarImoveisPlanilha,
  buscarClientes = buscarClientesPlanilha,
  agora = Date.now,
  limites = SEG,
  hoje = () => crm.hojeSP(),
} = {}) {
  const router = express.Router();
  const limiteFicha = new LimitadorTentativas({ ...limites.contratos.porUsuario, agora });
  const achar = (rows, id) => rows.find((r) => t(r['ID']).toLowerCase() === id.toLowerCase()) ?? null;
  const idDe = (req) => t(req.params.id);

  router.get('/alertas/autorizacoes', ah(async (req, res) => {
    const pedido = Number.parseInt(req.query.dias, 10);
    const dias = pedido >= 0 && pedido <= 90 ? pedido : crm.DIAS_ALERTA_PADRAO;
    const rows = await buscarImoveis();
    const h = hoje();
    const vencendo = [];
    const vencidas = [];
    for (const r of rows) {
      const sit = crm.situacaoAutorizacao(r, h, dias);
      if (!sit || sit.estado === 'ok') continue;
      const item = {
        id: t(r['ID']), tipo: t(r['Tipo']), subtipo: t(r['Subtipo']),
        bairro: t(r['Bairro Imóvel']), cidade: t(r['Cidade Imóvel']),
        vendedor: t(r['Nome / Razão Social']),
        vencimento: sit.vencimento, diasRestantes: sit.diasRestantes,
      };
      (sit.estado === 'vencida' ? vencidas : vencendo).push(item);
    }
    vencendo.sort((a, b) => a.diasRestantes - b.diasRestantes);
    vencidas.sort((a, b) => b.diasRestantes - a.diasRestantes); // as vencidas há menos tempo primeiro
    res.json({ dias, vencendo, vencidas: vencidas.slice(0, MAX_VENCIDAS), totalVencidas: vencidas.length });
  }));

  router.get('/clientes/:id/imoveis-compativeis', ah(async (req, res) => {
    const id = idDe(req);
    if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'ID inválido' });
    const cliente = achar(await buscarClientes(), id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json({ data: crm.imoveisCompativeis(cliente, await buscarImoveis()) });
  }));

  router.get('/imoveis/:id/clientes-compativeis', ah(async (req, res) => {
    const id = idDe(req);
    if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'ID inválido' });
    const imovel = achar(await buscarImoveis(), id);
    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ data: crm.clientesCompativeis(imovel, await buscarClientes()) });
  }));

  router.get('/imoveis/:id/ficha', ah(async (req, res) => {
    const id = idDe(req);
    if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'ID inválido' });
    const chave = `ficha:${t(req.jwtPayload?.user).toLowerCase()}`;
    const bloqueio = limiteFicha.consultar(chave);
    if (bloqueio.bloqueado) {
      res.set('Retry-After', String(bloqueio.retryAfterSeg));
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um instante e tente novamente.' });
    }
    limiteFicha.registrar(chave);

    const im = achar(await buscarImoveis(), id);
    if (!im) return res.status(404).json({ error: 'Imóvel não encontrado' });
    if (!crm.imovelAtivo(im)) return res.status(409).json({ error: 'Imóvel vendido ou cancelado: não há ficha para enviar.' });

    const link = t(im['Link Pasta Fotos']);
    const pdf = await gerarPdfFicha({
      id: t(im['ID']), tipo: t(im['Tipo']), subtipo: t(im['Subtipo']),
      bairro: t(im['Bairro Imóvel']), cidade: t(im['Cidade Imóvel']), uf: t(im['UF Imóvel']),
      valor: t(im['Valor']), area: t(im['Área (m²)']),
      condicoesPagamento: t(im['Condições de Pagamento']), descricao: t(im['Descrição']),
      linkFotos: /^https?:\/\//i.test(link) ? link : '',
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ficha-${t(im['ID'])}.pdf"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.status(200).end(pdf);
  }));

  return router;
}

module.exports = { criarRotasCrm };
