const { appendRow, getRows, getColumnA, updateRowById, deleteRowById, deleteMovimentacoesByRef, CLIENTES_SHEET } = require('../sheets');

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
            dataAniversario = '', email = '', telefone = '', endereco = {} } = dadosPessoais;
    const { logradouro = '', numero = '', complemento = '', bairro = '',
            cidade = '', uf = '', cep = '' } = endereco;
    const { hobbies = '', gostosPessoais = '', bebidaPreferida = '' } = preferencias;
    const { imovelInteresse = '' } = vinculo;

    const id = await generateClienteId();
    const now = new Date().toLocaleDateString('pt-BR');

    // Endereço concatenado (mantém coluna original intacta)
    const endConcat = [logradouro, numero, complemento, bairro, cidade, uf, cep].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente CLIENTES_HEADERS (23 colunas)
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
    ];

    await appendRow(CLIENTES_SHEET, row);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('[POST /cliente]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /clientes
async function listClientes(req, res) {
  try {
    const rows = await getRows(CLIENTES_SHEET);
    const q = (req.query.q || '').toLowerCase().trim();
    const filtered = q
      ? rows.filter(
          (r) =>
            (r['ID'] || '').toLowerCase().includes(q) ||
            (r['Nome'] || '').toLowerCase().includes(q) ||
            (r['CPF'] || '').toLowerCase().includes(q)
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
            dataAniversario = '', email = '', telefone = '', endereco = {} } = dadosPessoais;
    const { logradouro = '', numero = '', complemento = '', bairro = '',
            cidade = '', uf = '', cep = '' } = endereco;
    const { hobbies = '', gostosPessoais = '', bebidaPreferida = '' } = preferencias;
    const { imovelInteresse = '' } = vinculo;

    // Endereço concatenado (mantém coluna original intacta)
    const endConcat = [logradouro, numero, complemento, bairro, cidade, uf, cep].filter(Boolean).join(', ');

    // A ordem dos campos DEVE seguir exatamente CLIENTES_HEADERS (23 colunas)
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
    ];

    await updateRowById(CLIENTES_SHEET, id, row);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[PUT /cliente]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

module.exports = { createCliente, listClientes, deleteCliente, updateCliente };
