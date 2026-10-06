'use strict';
/**
 * Rotas do gerador de contratos. O contrato é gerado NA HORA e entregue na resposta: não é salvo no
 * servidor nem na planilha. Único registro: uma linha em Movimentações (tipo "Contrato", usuário, data e ID
 * do imóvel) — sem nome, CPF ou qualquer dado pessoal. Nenhum dado do contrato vai para os logs.
 *
 * Montagem: authMiddleware (JWT) -> limite de requisições -> parser JSON (32kb) -> handler.
 */
const express = require('express');
const SEG = require('../config/seguranca');
const { LimitadorTentativas } = require('../utils/limitador');
const { gerarTextoAutorizacaoVenda, montarContexto, ContratoValidationError, DEFAULTS } = require('../utils/contratoAutorizacao');
const { gerarPdfContrato, marcaMinutaAtiva } = require('../utils/pdfContrato');
const { mapearImovelParaContrato } = require('../utils/dadosImovelContrato');

const ID_VALIDO = /^[A-Za-z0-9-]{3,30}$/;
const TIPO_MOVIMENTACAO = 'Contrato';
const DESCRICAO_MOVIMENTACAO = 'Contrato gerado: Autorização para Venda';

// Dependências padrão (planilha). Carregadas só quando usadas, para os testes não precisarem de credenciais.
async function buscarImovelNaPlanilha(id) {
  const { getRows, IMOVEIS_SHEET } = require('../sheets');
  const alvo = id.toLowerCase();
  const rows = await getRows(IMOVEIS_SHEET);
  return rows.find((r) => String(r['ID'] ?? '').toLowerCase() === alvo) ?? null;
}
const registrarNaPlanilha = (dados) => require('./movimentacoes').registrarMovimentacao(dados);

const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function criarRotasContratos({
  authMiddleware,
  buscarImovel = buscarImovelNaPlanilha,
  registrarMovimentacao = registrarNaPlanilha,
  agora = Date.now,
  limites = SEG,
}) {
  if (typeof authMiddleware !== 'function') throw new Error('authMiddleware é obrigatório nas rotas de contrato');

  const router = express.Router();
  const porUsuario = new LimitadorTentativas({ ...limites.contratos.porUsuario, agora });
  const porIp = new LimitadorTentativas({ ...limites.contratos.porIp, agora });

  // 1) Autenticação (401 sem token válido)
  router.use(authMiddleware);

  // 2) Limite de requisições por usuário e por IP
  router.use((req, res, next) => {
    const chaveUsuario = `u:${String(req.jwtPayload?.user ?? '').toLowerCase()}`;
    const chaveIp = `ip:${req.ip}`;
    const bloqueio = [porUsuario.consultar(chaveUsuario), porIp.consultar(chaveIp)].find((e) => e.bloqueado);
    if (bloqueio) {
      res.set('Retry-After', String(bloqueio.retryAfterSeg));
      return res.status(429).json({ error: 'Muitas requisições. Aguarde um instante e tente novamente.' });
    }
    porUsuario.registrar(chaveUsuario);
    porIp.registrar(chaveIp);
    next();
  });

  // 3) Corpo JSON pequeno (o contrato tem poucos campos)
  const corpoJson = [
    express.json({ limit: limites.contratos.limiteCorpo, type: 'application/json' }),
    (req, res, next) => {
      if (!req.is('application/json')) return res.status(415).json({ error: 'Envie o corpo como application/json' });
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Corpo inválido' });
      next();
    },
  ];

  const respostaValidacao = (res, e) => res.status(400).json({ error: 'Dados inválidos', erros: e.erros });

  // GET /contratos/autorizacao-venda/imovel/:id — dados do imóvel para pré-preencher a tela
  router.get('/autorizacao-venda/imovel/:id', ah(async (req, res) => {
    const id = String(req.params.id ?? '').trim();
    if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'ID do imóvel inválido' });
    const row = await buscarImovel(id);
    if (!row) return res.status(404).json({ error: 'Imóvel não encontrado' });
    const dados = mapearImovelParaContrato(row);
    const prazo = Number.parseInt(dados.prazo_dias, 10);
    const padroes = { ...DEFAULTS, exclusividade: 'nao' };
    if (prazo > 0) padroes.prazo_dias = prazo; // prazo combinado no cadastro do imóvel
    res.json({ ...dados, padroes });
  }));

  // POST /contratos/autorizacao-venda/previa — valida e devolve os valores por extenso e os avisos (não gera PDF)
  router.post('/autorizacao-venda/previa', ...corpoJson, ah(async (req, res) => {
    try {
      const { contexto, avisos } = montarContexto(req.body);
      const c = contexto;
      res.json({
        valido: true,
        avisos,
        marca_minuta: marcaMinutaAtiva(), // a tela mostra a marca MINUTA na prévia quando o PDF também a terá
        resumo: {
          quantidade_proprietarios: c.proprietarios.length,
          valor: c.valor, valor_extenso: c.valor_extenso,
          comissao_pct: c.comissao_pct, comissao_extenso: c.comissao_extenso,
          prazo_dias: c.prazo_dias, prazo_extenso: c.prazo_extenso,
          multa_pct: c.multa_pct, multa_extenso: c.multa_extenso,
          juros_pct_mes: c.juros_pct_mes, juros_extenso: c.juros_extenso,
          data_assinatura: c.data_assinatura,
        },
      });
    } catch (e) {
      if (e instanceof ContratoValidationError) return respostaValidacao(res, e);
      throw e;
    }
  }));

  // POST /contratos/autorizacao-venda — gera e devolve o PDF
  router.post('/autorizacao-venda', ...corpoJson, ah(async (req, res) => {
    const id = String(req.body.imovel_id ?? '').trim();
    if (!ID_VALIDO.test(id)) return res.status(400).json({ error: 'Dados inválidos', erros: [{ campo: 'imovel_id', mensagem: 'ID do imóvel inválido' }] });

    let texto;
    try {
      ({ texto } = gerarTextoAutorizacaoVenda(req.body));
    } catch (e) {
      if (e instanceof ContratoValidationError) return respostaValidacao(res, e);
      throw e;
    }

    const row = await buscarImovel(id);
    if (!row) return res.status(404).json({ error: 'Imóvel não encontrado' });
    const idCanonico = String(row['ID']);

    const pdf = await gerarPdfContrato(texto);

    // Registro mínimo e sem dados pessoais. Se falhar, o contrato é entregue mesmo assim (avisa por cabeçalho).
    let registro = 'ok';
    try {
      await registrarMovimentacao({
        usuario: String(req.jwtPayload?.user ?? ''),
        tipo: TIPO_MOVIMENTACAO,
        idReferencia: idCanonico,
        nomeReferencia: '',
        descricao: DESCRICAO_MOVIMENTACAO,
      });
    } catch {
      registro = 'falhou';
      console.error('[contrato] falha ao registrar a movimentação');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="autorizacao-venda-${idCanonico}.pdf"`,
      'Content-Length': String(pdf.length),
      'X-Registro-Movimentacao': registro,
    });
    res.status(200).end(pdf);
  }));

  router.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
  return router;
}

module.exports = { criarRotasContratos, ID_VALIDO, TIPO_MOVIMENTACAO, DESCRICAO_MOVIMENTACAO };
