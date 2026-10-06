const { camposNovosCliente, ErroValidacao, filtrarClientes } = require('../utils/crm');
const { appendRow, getRows, getColumnA, updateRowById, deleteRowById, deleteMovimentacoesByRef, CLIENTES_SHEET } = require('../sheets');

// Tipo de cliente aceito na planilha. Qualquer outro valor vira vazio (cadastros antigos não têm tipo).
const TIPOS_CLIENTE = ['Vendedor', 'Comprador', 'Ambos'];
function normalizarTipoCliente(v) {
  const t = String(v ?? '').trim();
  return TIPOS_CLIENTE.includes(t) ? t : '';
}
// Quem aparece ao filtrar por tipo: "Vendedor" inclui também quem é "Ambos" (e o mesmo para "Comprador").
function tiposQueIncluem(tipo) {
  return tipo === 'Ambos' ? ['Ambos'] : [tipo, 'Ambos'];
}

async function generateClienteId() {
  const existingIds = await getColumnA(CLIENTES_SHEET);
  let maxSeq = 0;
  existingIds.forEach((id) => {
    const m = String(id).match(/^CLI(\d+)$/);
    if (m) {
      const seq = parseInt(m[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });
  return `CLI${String(maxSeq + 1).padStart(3, '0')}`;
}

// POST /cliente
async function createCliente(req, res) {
  try {
    const b = req.body;

    // ── Desestrutura grupos do payload ──────────────────────────
    const { dadosPessoais = {}, preferencias = {}, vinculo = {}, movimentacao = '' } = b;
    const { nome = '', cpf = '', rg = '', estadoCivil = '', conjuge = '',
            dataAniversario = '', email = '', telefone = '', endereco = {}, tipoCliente = '' } = dadosPessoais;
    const { logradouro = '', numero = '', complemento = '', bairro = '',
            cidade = '', uf = '', cep = '' } = endereco;
    const { hobbies = '', gostosPessoais = '', bebidaPreferida = '' } = preferencias;
    const { imovelInteresse = '' } = vinculo;

    const id = await generateClienteId();
    const now = new Date().toLocaleDateString('pt-BR');

    // Endereço concatenado (mantém coluna original intacta)
    const endConcat = [logradouro, numero, complemento, bairro, cidade, uf, cep].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente CLIENTES_HEADERS (31 colunas)
    const novos = camposNovosCliente(b);
    const row = [
      id,               // 1  ID
      now,              // 2  Data Cadastro
      nome,             // 3  Nome
      cpf,              // 4  CPF
      rg,               // 5  RG
      estadoCivil,      // 6  Estado Civil
      conjuge,          // 7  Cônjuge
      endConcat,        // 8  Endereço (concatenado)
      cidade,           // 9  Cidade
      uf,               // 10 UF
      cep,              // 11 CEP
      dataAniversario,  // 12 Data Aniversário
      email,            // 13 E-mail
      telefone,         // 14 Telefone
      hobbies,          // 15 Hobbies
      gostosPessoais,   // 16 Gostos Pessoais
      bebidaPreferida,  // 17 Bebida Preferida
      imovelInteresse,  // 18 Imóvel de Interesse
      movimentacao,     // 19 Movimentação
      // ── Colunas separadas de endereço (NOVAS, adicionadas ao final) ──
      logradouro,       // 20 Logradouro
      numero,           // 21 Número
      complemento,      // 22 Complemento
      bairro,           // 23 Bairro
      normalizarTipoCliente(tipoCliente), // 24 Tipo de Cliente
      ...novos,                           // 25-31 Status + perfil de busca
    ];

    await appendRow(CLIENTES_SHEET, row);
    res.status(201).json({ success: true, id });
  } catch (err) {
    if (err instanceof ErroValidacao) return res.status(400).json({ error: err.message });
    console.error('[POST /cliente]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /clientes
async function listClientes(req, res) {
  try {
    const rows = await getRows(CLIENTES_SHEET);
    const q = (req.query.q || '').toLowerCase().trim();
    const tipo = normalizarTipoCliente(req.query.tipo);
    const porTipo = tipo ? rows.filter((r) => tiposQueIncluem(tipo).includes(r['Tipo de Cliente'])) : rows;
    const porStatus = filtrarClientes(porTipo, { status: req.query.status, cidade: req.query.cidade });
    const filtered = q
      ? porStatus.filter(
          (r) =>
            (r['ID'] || '').toLowerCase().includes(q) ||
            (r['Nome'] || '').toLowerCase().includes(q) ||
            (r['CPF'] || '').toLowerCase().includes(q)
        )
      : porStatus;

    const total      = filtered.length;
    const limit      = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const start      = (page - 1) * limit;
    const data       = filtered.slice(start, start + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    res.json({ data, total, page, totalPages });
  } catch (err) {
    console.error('[GET /clientes]', err);
    res.status(500).json({ error: err.message });
  }
}

// DELETE /cliente/:id
async function deleteCliente(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });
    await deleteRowById(CLIENTES_SHEET, id);
    await deleteMovimentacoesByRef(id); // Remove movimentações vinculadas
    res.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /cliente]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

// PUT /cliente/:id
async function updateCliente(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID é obrigatório.' });

    const rows = await getRows(CLIENTES_SHEET);
    const original = rows.find((r) => r['ID'] === id);
    if (!original) return res.status(404).json({ error: `Cliente "${id}" não encontrado.` });

    const b = req.body;
    const { dadosPessoais = {}, preferencias = {}, vinculo = {}, movimentacao = '' } = b;
    const { nome = '', cpf = '', rg = '', estadoCivil = '', conjuge = '',
            dataAniversario = '', email = '', telefone = '', endereco = {}, tipoCliente = '' } = dadosPessoais;
    const { logradouro = '', numero = '', complemento = '', bairro = '',
            cidade = '', uf = '', cep = '' } = endereco;
    const { hobbies = '', gostosPessoais = '', bebidaPreferida = '' } = preferencias;
    const { imovelInteresse = '' } = vinculo;

    // Endereço concatenado (mantém coluna original intacta)
    const endConcat = [logradouro, numero, complemento, bairro, cidade, uf, cep].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente CLIENTES_HEADERS (31 colunas)
    const novos = camposNovosCliente(b, original);
    const row = [
      id,                        // 1  ID (preserva original)
      original['Data Cadastro'], // 2  Data Cadastro (preserva original)
      nome,                      // 3  Nome
      cpf,                       // 4  CPF
      rg,                        // 5  RG
      estadoCivil,               // 6  Estado Civil
      conjuge,                   // 7  Cônjuge
      endConcat,                 // 8  Endereço (concatenado)
      cidade,                    // 9  Cidade
      uf,                        // 10 UF
      cep,                       // 11 CEP
      dataAniversario,           // 12 Data Aniversário
      email,                     // 13 E-mail
      telefone,                  // 14 Telefone
      hobbies,                   // 15 Hobbies
      gostosPessoais,            // 16 Gostos Pessoais
      bebidaPreferida,           // 17 Bebida Preferida
      imovelInteresse,           // 18 Imóvel de Interesse
      movimentacao,              // 19 Movimentação
      // ── Colunas separadas de endereço (NOVAS, adicionadas ao final) ──
      logradouro,                // 20 Logradouro
      numero,                    // 21 Número
      complemento,               // 22 Complemento
      bairro,                    // 23 Bairro
      normalizarTipoCliente(tipoCliente), // 24 Tipo de Cliente
      ...novos,                           // 25-31 Status + perfil de busca
    ];

    await updateRowById(CLIENTES_SHEET, id, row);
    res.json({ success: true, id });
  } catch (err) {
    if (err instanceof ErroValidacao) return res.status(400).json({ error: err.message });
    console.error('[PUT /cliente]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

module.exports = { createCliente, listClientes, deleteCliente, updateCliente, normalizarTipoCliente, tiposQueIncluem };
