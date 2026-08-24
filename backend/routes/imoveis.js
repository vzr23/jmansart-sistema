const { appendRow, getRows, getColumnA, updateRowById, deleteRowById, deleteMovimentacoesByRef, IMOVEIS_SHEET } = require('../sheets');
const { getCityAbbrev } = require('../utils/cities');

// ─────────────────────────────────────────
// Geração de ID
// Formato: [SIGLA][SEQ 3 dígitos][ANO]
// Ex: BC0012026
// ─────────────────────────────────────────
async function generateId(cidadeAbrev) {
  const year = new Date().getFullYear().toString();
  const prefix = (cidadeAbrev || 'XX').toUpperCase();

  const existingIds = await getColumnA(IMOVEIS_SHEET);
  const pattern = new RegExp(`^${prefix}(\\d+)${year}$`);

  let maxSeq = 0;
  existingIds.forEach((id) => {
    const m = String(id).match(pattern);
    if (m) {
      const seq = parseInt(m[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}${year}`;
}

// POST /imovel
async function createImovel(req, res) {
  try {
    const b = req.body;

    // ── Desestrutura grupos do payload ──────────────────────────
    const { tipoImovel = {}, autorizacaoVenda = '', vendedor = {}, imovel = {}, condicoesComerciais = {}, movimentacao = '' } = b;
    const { tipo = '', subtipos = [] } = tipoImovel;
    const { tipoVendedor = 'PF', nome = '', cpf = '', rg = '', estadoCivil = '', conjuge = '',
            dataAniversario = '', enderecoVendedor = {}, razaoSocial = '', cnpj = '', enderecoEmpresa = '',
            site = '', email = '', telefone = '' } = vendedor;
    const { logradouro: lv = '', numero: nv = '', complemento: cv = '', bairro: bv = '', cidade: cdv = '', uf: ufv = '', cep: cepv = '' } = enderecoVendedor;
    const { logradouro: li = '', numero: ni = '', complemento: ci = '', bairro: bi = '',
            cidade: cidadeImovel = '', cidadeAbrev: cidadeAbrevRaw = '', uf: ufImovel = '', cep: cepImovel = '',
            inscricaoIptu = '', matricula = '', quitado = '', saldoDevedor = '', observacoes = '' } = imovel;
    const { valor = '', condicoesPagamento = '' } = condicoesComerciais;

    // ── Gera ID ──────────────────────────────────────────────────
    const cidadeAbrev = cidadeAbrevRaw ? cidadeAbrevRaw.toUpperCase() : getCityAbbrev(cidadeImovel);
    const id = await generateId(cidadeAbrev);
    const now = new Date().toLocaleDateString('pt-BR');

    const row = [
      id,
      now,
      tipo,
      subtipos.join(', '),
      autorizacaoVenda,
      tipoVendedor,
      tipoVendedor === 'PJ' ? razaoSocial : nome,
      tipoVendedor === 'PJ' ? cnpj : cpf,
      rg,
      estadoCivil,
      conjuge,
      // Endereço Vendedor (campos separados)
      tipoVendedor === 'PJ' ? enderecoEmpresa : lv,
      tipoVendedor === 'PJ' ? '' : nv,
      tipoVendedor === 'PJ' ? '' : cv,
      tipoVendedor === 'PJ' ? '' : bv,
      tipoVendedor === 'PJ' ? '' : cdv,
      tipoVendedor === 'PJ' ? '' : ufv,
      tipoVendedor === 'PJ' ? '' : cepv,
      dataAniversario,
      // Endereço Imóvel (campos separados)
      li,
      ni,
      ci,
      bi,
      cidadeImovel,
      ufImovel,
      cepImovel,
      inscricaoIptu,
      matricula,
      quitado,
      saldoDevedor,
      observacoes,
      valor,
      condicoesPagamento,
      email,
      telefone,
      tipoVendedor === 'PJ' ? site : '',
      movimentacao,
    ];

    await appendRow(IMOVEIS_SHEET, row);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('[POST /imovel]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /imoveis
async function listImoveis(req, res) {
  try {
    const rows = await getRows(IMOVEIS_SHEET);
    const q = (req.query.q || '').toLowerCase().trim();
    const filtered = q
      ? rows.filter(
          (r) =>
            (r['ID'] || '').toLowerCase().includes(q) ||
            (r['Nome / Razão Social'] || '').toLowerCase().includes(q) ||
            (r['Endereço Imóvel'] || '').toLowerCase().includes(q) ||
            (r['Cidade Imóvel'] || '').toLowerCase().includes(q)
        )
      : rows;

    const total      = filtered.length;
    const limit      = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const start      = (page - 1) * limit;
    const data       = filtered.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({ data, total, page, totalPages });
  } catch (err) {
    console.error('[GET /imoveis]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /imoveis/sigla?cidade=NomeCidade
function getCidadeSigla(req, res) {
  const cidade = req.query.cidade || '';
  res.json({ sigla: getCityAbbrev(cidade) });
}

// DELETE /imovel/:id
async function deleteImovel(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
    await deleteRowById(IMOVEIS_SHEET, id);
    await deleteMovimentacoesByRef(id); // Remove movimentações vinculadas
    res.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /imovel]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

// PUT /imovel/:id
async function updateImovel(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    // Busca o registro original para preservar ID e Data Cadastro
    const rows = await getRows(IMOVEIS_SHEET);
    const original = rows.find((r) => r['ID'] === id);
    if (!original) return res.status(404).json({ error: `Imóvel "${id}" não encontrado.` });

    const b = req.body;
    const { tipoImovel = {}, autorizacaoVenda = '', vendedor = {}, imovel = {}, condicoesComerciais = {}, movimentacao = '' } = b;
    const { tipo = '', subtipos = [] } = tipoImovel;
    const { tipoVendedor = 'PF', nome = '', cpf = '', rg = '', estadoCivil = '', conjuge = '',
            dataAniversario = '', enderecoVendedor = {}, razaoSocial = '', cnpj = '', enderecoEmpresa = '',
            site = '', email = '', telefone = '' } = vendedor;
    const { logradouro: lv = '', numero: nv = '', complemento: cv = '', bairro: bv = '', cidade: cdv = '', uf: ufv = '', cep: cepv = '' } = enderecoVendedor;
    const { logradouro: li = '', numero: ni = '', complemento: ci = '', bairro: bi = '',
            cidade: cidadeImovel = '', uf: ufImovel = '', cep: cepImovel = '',
            inscricaoIptu = '', matricula = '', quitado = '', saldoDevedor = '', observacoes = '' } = imovel;
    const { valor = '', condicoesPagamento = '' } = condicoesComerciais;

    const row = [
      id,                         // Preserva ID original
      original['Data Cadastro'],  // Preserva data de cadastro original
      tipo,
      subtipos.join(', '),
      autorizacaoVenda,
      tipoVendedor,
      tipoVendedor === 'PJ' ? razaoSocial : nome,
      tipoVendedor === 'PJ' ? cnpj : cpf,
      rg,
      estadoCivil,
      conjuge,
      // Endereço Vendedor (campos separados)
      tipoVendedor === 'PJ' ? enderecoEmpresa : lv,
      tipoVendedor === 'PJ' ? '' : nv,
      tipoVendedor === 'PJ' ? '' : cv,
      tipoVendedor === 'PJ' ? '' : bv,
      tipoVendedor === 'PJ' ? '' : cdv,
      tipoVendedor === 'PJ' ? '' : ufv,
      tipoVendedor === 'PJ' ? '' : cepv,
      dataAniversario,
      // Endereço Imóvel (campos separados)
      li,
      ni,
      ci,
      bi,
      cidadeImovel,
      ufImovel,
      cepImovel,
      inscricaoIptu,
      matricula,
      quitado,
      saldoDevedor,
      observacoes,
      valor,
      condicoesPagamento,
      email,
      telefone,
      tipoVendedor === 'PJ' ? site : '',
      movimentacao,
    ];

    await updateRowById(IMOVEIS_SHEET, id, row);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[PUT /imovel]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

module.exports = { createImovel, listImoveis, getCidadeSigla, deleteImovel, updateImovel };
