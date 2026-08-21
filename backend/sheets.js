const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '15BLBHc0watZaGCzhzItPDTRYmWa4UUoxAaGorIXUunQ';
const CREDENTIALS_PATH = path.join(__dirname, 'credentials', 'jmansart-cadastro-4ea26f92fcb7.json');

const IMOVEIS_SHEET = 'Imóveis';
const CLIENTES_SHEET = 'Clientes';
const MOVIMENTACOES_SHEET = 'Movimentações';

const IMOVEIS_HEADERS = [
  'ID', 'Data Cadastro', 'Tipo', 'Subtipo', 'Autorização Venda',
  'Tipo Vendedor', 'Nome / Razão Social', 'CPF / CNPJ', 'RG',
  'Estado Civil', 'Cônjuge', 'Endereço Vendedor', 'Data Aniversário',
  'Endereço Imóvel', 'Cidade Imóvel', 'UF Imóvel', 'CEP Imóvel',
  'Inscrição IPTU', 'Matrícula', 'Quitado', 'Saldo Devedor',
  'Observações', 'Valor', 'Condições de Pagamento',
  'E-mail', 'Telefone', 'Site', 'Movimentação'
];

const CLIENTES_HEADERS = [
  'ID', 'Data Cadastro', 'Nome', 'CPF', 'RG', 'Estado Civil', 'Cônjuge',
  'Endereço', 'Cidade', 'UF', 'CEP', 'Data Aniversário',
  'Hobbies', 'Gostos Pessoais', 'Bebida Preferida',
  'Imóvel de Interesse', 'Movimentação'
];

const MOVIMENTACOES_HEADERS = [
  'ID', 'Data/Hora', 'Usuário', 'Tipo', 'ID Referência', 'Nome Referência', 'Descrição'
];

/**
 * Converte número de coluna em letra(s) para o Sheets.
 * Ex: 1→A, 26→Z, 27→AA, 28→AB
 */
function colLetter(n) {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const auth = getAuth();
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

/**
 * Garante que a aba existe na planilha.
 * Se não existir, cria ela.
 */
async function ensureSheet(sheets, tabName) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = (meta.data.sheets || []).some(
    (s) => s.properties.title === tabName
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }
}

/**
 * Garante que a aba existe e tem cabeçalhos na linha 1.
 * Se a primeira célula estiver vazia, insere os cabeçalhos.
 */
async function ensureHeaders(sheets, tabName, headers) {
  await ensureSheet(sheets, tabName);

  const range = `${tabName}!A1:${colLetter(headers.length)}1`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const firstRow = (res.data.values || [])[0] || [];
  if (!firstRow[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      resource: { values: [headers] },
    });
  }
}

async function appendRow(tabName, row) {
  const sheets = await getSheets();
  const headersMap = {
    [IMOVEIS_SHEET]: IMOVEIS_HEADERS,
    [CLIENTES_SHEET]: CLIENTES_HEADERS,
    [MOVIMENTACOES_SHEET]: MOVIMENTACOES_HEADERS,
  };
  const headers = headersMap[tabName] || IMOVEIS_HEADERS;
  await ensureHeaders(sheets, tabName, headers);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:${colLetter(headers.length)}`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [row] },
  });
}

async function getRows(tabName) {
  const sheets = await getSheets();
  const headersMap = {
    [IMOVEIS_SHEET]: IMOVEIS_HEADERS,
    [CLIENTES_SHEET]: CLIENTES_HEADERS,
    [MOVIMENTACOES_SHEET]: MOVIMENTACOES_HEADERS,
  };
  const headers = headersMap[tabName] || IMOVEIS_HEADERS;
  await ensureHeaders(sheets, tabName, headers);

  const range = `${tabName}!A:${colLetter(headers.length)}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const sheetHeaders = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    sheetHeaders.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function getColumnA(tabName) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:A`,
  });
  return (res.data.values || []).slice(1).flat().filter(Boolean);
}

/**
 * Remove todas as linhas da aba Movimentações onde ID Referência (coluna E) = refId.
 * Deleta de baixo para cima para evitar deslocamento de índices.
 */
async function deleteMovimentacoesByRef(refId) {
  const sheets = await getSheets();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = (meta.data.sheets || []).find(
    (s) => s.properties.title === MOVIMENTACOES_SHEET
  );
  if (!sheet) return; // aba ainda não existe, nada a fazer
  const sheetId = sheet.properties.sheetId;

  // Lê colunas A:E para localizar ID Referência (coluna E = índice 4)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${MOVIMENTACOES_SHEET}!A:E`,
  });
  const values = res.data.values || [];

  // Coleta índices (0-based) das linhas que batem com o refId
  const toDelete = [];
  for (let i = 1; i < values.length; i++) {
    if ((values[i][4] || '') === String(refId)) toDelete.push(i);
  }
  if (toDelete.length === 0) return;

  // Deleta de baixo para cima para não deslocar os índices
  toDelete.sort((a, b) => b - a);
  const requests = toDelete.map((rowIndex) => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests },
  });
}

/**
 * Remove uma linha da planilha pelo valor do ID (coluna A).
 */
async function deleteRowById(tabName, id) {
  const sheets = await getSheets();

  // Obtém o sheetId numérico da aba
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = (meta.data.sheets || []).find(
    (s) => s.properties.title === tabName
  );
  if (!sheet) throw new Error(`Aba "${tabName}" não encontrada`);
  const sheetId = sheet.properties.sheetId;

  // Localiza a linha pelo ID (coluna A, ignora cabeçalho)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:A`,
  });
  const values = res.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if ((values[i][0] || '') === String(id)) {
      rowIndex = i; // índice 0-based na planilha (linha 1 = cabeçalho = índice 0)
      break;
    }
  }
  if (rowIndex === -1) throw new Error(`Registro "${id}" não encontrado na aba "${tabName}"`);

  // Remove a linha
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}

module.exports = {
  SPREADSHEET_ID,
  IMOVEIS_SHEET,
  CLIENTES_SHEET,
  MOVIMENTACOES_SHEET,
  IMOVEIS_HEADERS,
  CLIENTES_HEADERS,
  MOVIMENTACOES_HEADERS,
  appendRow,
  getRows,
  getColumnA,
  deleteRowById,
  deleteMovimentacoesByRef,
};
