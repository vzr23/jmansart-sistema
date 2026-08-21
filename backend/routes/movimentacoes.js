const { appendRow, getRows, getColumnA, MOVIMENTACOES_SHEET } = require('../sheets');

// ─────────────────────────────────────────
// Geração de ID: MOV0001, MOV0002, ...
// ─────────────────────────────────────────
async function generateMovId() {
  const existingIds = await getColumnA(MOVIMENTACOES_SHEET);
  let maxSeq = 0;
  existingIds.forEach((id) => {
    const m = String(id).match(/^MOV(\d+)$/);
    if (m) {
      const seq = parseInt(m[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });
  return `MOV${String(maxSeq + 1).padStart(4, '0')}`;
}

// POST /movimentacao
async function createMovimentacao(req, res) {
  try {
    const { usuario = '', tipo = '', idReferencia = '', nomeReferencia = '', descricao = '' } = req.body;

    if (!idReferencia || !descricao) {
      return res.status(400).json({ error: 'idReferencia e descricao são obrigatórios.' });
    }

    const id = await generateMovId();

    // Formato: 21/08/2026 14:35:22
    const agora = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    const row = [id, agora, usuario, tipo, idReferencia, nomeReferencia, descricao];
    await appendRow(MOVIMENTACOES_SHEET, row);

    res.status(201).json({ success: true, id, dataHora: agora });
  } catch (err) {
    console.error('[POST /movimentacao]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /movimentacoes?ref=BC0012026
async function listMovimentacoes(req, res) {
  try {
    const rows = await getRows(MOVIMENTACOES_SHEET);
    const ref = (req.query.ref || '').trim();
    const filtered = ref
      ? rows.filter((r) => (r['ID Referência'] || '') === ref)
      : rows;
    // Retorna do mais recente para o mais antigo
    res.json(filtered.reverse());
  } catch (err) {
    console.error('[GET /movimentacoes]', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createMovimentacao, listMovimentacoes };
