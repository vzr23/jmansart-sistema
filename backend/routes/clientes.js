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

    const enderecoStr = [logradouro, numero, complemento, bairro].filter(Boolean).join(', ');

    const row = [
      id,
      now,
      nome,
      cpf,
      rg,
      estadoCivil,
      conjuge,
      enderecoStr,
      cidade,
      uf,
      cep,
      dataAniversario,
      email,
      telefone,
      hobbies,
      gostosPessoais,
      bebidaPreferida,
      imovelInteresse,
      movimentacao,
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
    res.json(filtered);
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

    const enderecoStr = [logradouro, numero, complemento, bairro].filter(Boolean).join(', ');

    const row = [
      id,
      original['Data Cadastro'],
      nome,
      cpf,
      rg,
      estadoCivil,
      conjuge,
      enderecoStr,
      cidade,
      uf,
      cep,
      dataAniversario,
      email,
      telefone,
      hobbies,
      gostosPessoais,
      bebidaPreferida,
      imovelInteresse,
      movimentacao,
    ];

    await updateRowById(CLIENTES_SHEET, id, row);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[PUT /cliente]', err);
    res.status(err.message.includes('não encontrado') ? 404 : 500).json({ error: err.message });
  }
}

module.exports = { createCliente, listClientes, deleteCliente, updateCliente };
