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

    // Endereço concatenado (mantém coluna original intacta)
    const endVendedor = tipoVendedor === 'PJ'
      ? enderecoEmpresa
      : [lv, nv, cv, bv, cdv, ufv, cepv].filter(Boolean).join(', ');
    const endImovel = [li, ni, ci, bi].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente IMOVEIS_HEADERS (39 colunas)
    const row = [
      id,                                          // 1  ID
      now,                                         // 2  Data Cadastro
      tipo,                                        // 3  Tipo
      subtipos.join(', '),                         // 4  Subtipo
      autorizacaoVenda,                            // 5  Autorização Venda
      tipoVendedor,                                // 6  Tipo Vendedor
      tipoVendedor === 'PJ' ? razaoSocial : nome,  // 7  Nome / Razão Social
      tipoVendedor === 'PJ' ? cnpj : cpf,          // 8  CPF / CNPJ
      rg,                                          // 9  RG
      estadoCivil,                                 // 10 Estado Civil
      conjuge,                                     // 11 Cônjuge
      endVendedor,                                 // 12 Endereço Vendedor (concatenado)
      dataAniversario,                             // 13 Data Aniversário
      endImovel,                                   // 14 Endereço Imóvel (concatenado)
      cidadeImovel,                                // 15 Cidade Imóvel
      ufImovel,                                    // 16 UF Imóvel
      cepImovel,                                   // 17 CEP Imóvel
      inscricaoIptu,                               // 18 Inscrição IPTU
      matricula,                                   // 19 Matrícula
      quitado,                                     // 20 Quitado
      saldoDevedor,                                // 21 Saldo Devedor
      observacoes,                                 // 22 Observações
      valor,                                       // 23 Valor
      condicoesPagamento,                          // 24 Condições de Pagamento
      email,                                       // 25 E-mail
      telefone,                                    // 26 Telefone
      tipoVendedor === 'PJ' ? site : '',           // 27 Site
      movimentacao,                                // 28 Movimentação
      // ── Colunas separadas de endereço (NOVAS, adicionadas ao final) ──
      tipoVendedor === 'PJ' ? enderecoEmpresa : lv, // 29 Logradouro Vendedor
      tipoVendedor === 'PJ' ? '' : nv,              // 30 Número Vendedor
      tipoVendedor === 'PJ' ? '' : cv,              // 31 Complemento Vendedor
      tipoVendedor === 'PJ' ? '' : bv,              // 32 Bairro Vendedor
      tipoVendedor === 'PJ' ? '' : cdv,             // 33 Cidade Vendedor
      tipoVendedor === 'PJ' ? '' : ufv,             // 34 UF Vendedor
      tipoVendedor === 'PJ' ? '' : cepv,            // 35 CEP Vendedor
      li,                                           // 36 Logradouro Imóvel
      ni,                                           // 37 Número Imóvel
      ci,                                           // 38 Complemento Imóvel
      bi,                                           // 39 Bairro Imóvel
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

    // Endereço concatenado (mantém coluna original intacta)
    const endVendedor = tipoVendedor === 'PJ'
      ? enderecoEmpresa
      : [lv, nv, cv, bv, cdv, ufv, cepv].filter(Boolean).join(', ');
    const endImovel = [li, ni, ci, bi].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente IMOVEIS_HEADERS (39 colunas)
    const row = [
      id,                                          // 1  ID (preserva original)
      original['Data Cadastro'],                   // 2  Data Cadastro (preserva original)
      tipo,                                        // 3  Tipo
      subtipos.join(', '),                         // 4  Subtipo
      autorizacaoVenda,                            // 5  Autorização Venda
      tipoVendedor,                                // 6  Tipo Vendedor
      tipoVendedor === 'PJ' ? razaoSocial : nome,  // 7  Nome / Razão Social
      tipoVendedor === 'PJ' ? cnpj : cpf,          // 8  CPF / CNPJ
      rg,                                          // 9  RG
      estadoCivil,                                 // 10 Estado Civil
      conjuge,                                     // 11 Cônjuge
      endVendedor,                                 // 12 Endereço Vendedor (concatenado)
      dataAniversario,                             // 13 Data Aniversário
      endImovel,                                   // 14 Endereço Imóvel (concatenado)
      cidadeImovel,                                // 15 Cidade Imóvel
      ufImovel,                                    // 16 UF Imóvel
      cepImovel,                                   // 17 CEP Imóvel
      inscricaoIptu,                               // 18 Inscrição IPTU
      matricula,                                   // 19 Matrícula
      quitado,                                     // 20 Quitado
      saldoDevedor,                                // 21 Saldo Devedor
      observacoes,                                 // 22 Observações
      valor,                                       // 23 Valor
      condicoesPagamento,                          // 24 Condições de Pagamento
      email,                                       // 25 E-mail
      telefone,                                    // 26 Telefone
      tipoVendedor === 'PJ' ? site : '',           // 27 Site
      movimentacao,                                // 28 Movimentação
      // ── Colunas separadas de endereço (NOVAS, adicionadas ao final) ──
      tipoVendedor === 'PJ' ? enderecoEmpresa : lv, // 29 Logradouro Vendedor
      tipoVendedor === 'PJ' ? '' : nv,              // 30 Número Vendedor
      tipoVendedor === 'PJ' ? '' : cv,              // 31 Complemento Vendedor
      tipoVendedor === 'PJ' ? '' : bv,              // 32 Bairro Vendedor
      tipoVendedor === 'PJ' ? '' : cdv,             // 33 Cidade Vendedor
      tipoVendedor === 'PJ' ? '' : ufv,             // 34 UF Vendedor
      tipoVendedor === 'PJ' ? '' : cepv,            // 35 CEP Vendedor
      li,                                           // 36 Logradouro Imóvel
      ni,                                           // 37 Número Imóvel
      ci,                                           // 38 Complemento Imóvel
      bi,                                           // 39 Bairro Imóvel
    ];

    await updateRowById(IMOVEIS_SHEET, id, row);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[PUT /imovel]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

module.exports = { createImovel, listImoveis, getCidadeSigla, deleteImovel, updateImovel };
