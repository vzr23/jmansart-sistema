'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { iniciar, token, req } = require('./helpers');
const crm = require('../utils/crm');

// ── Dados FICTÍCIOS ────────────────────────────────────────────────
const HOJE = new Date(Date.UTC(2026, 9, 10)); // 10/10/2026
const imovel = (extra = {}) => ({
  'ID': 'BC0012026', 'Tipo': 'Residencial', 'Subtipo': 'Apartamento', 'Autorização Venda': 'Sim',
  'Nome / Razão Social': 'Fulana Exemplo', 'CPF / CNPJ': '529.982.247-25', 'Matrícula': '99.999',
  'Logradouro Imóvel': 'Rua Secreta', 'Número Imóvel': '123', 'Bairro Imóvel': 'Itoupava Norte', 'Cidade Imóvel': 'Blumenau', 'UF Imóvel': 'SC',
  'Valor': 'R$ 800.000,00', 'Condições de Pagamento': 'Financiamento', 'Observações': 'nota interna', 'Telefone': '(47) 90000-0000',
  'Status Imóvel': 'Anunciado', 'Data Autorização': '01/09/2026', 'Prazo Autorização (dias)': '', 'Área (m²)': '85,5',
  'Descrição': 'Vista livre', 'Link Pasta Fotos': 'https://exemplo.test/fotos', ...extra,
});
const cliente = (extra = {}) => ({
  'ID': 'CLI001', 'Nome': 'Beltrano Teste', 'Telefone': '(47) 98888-0000', 'Tipo de Cliente': 'Comprador', 'Status Cliente': 'Novo',
  'Valor Mínimo': 'R$ 500.000,00', 'Valor Máximo': 'R$ 900.000,00', 'Tipo Procurado': 'Residencial',
  'Subtipos Procurados': 'Apartamento, Casa', 'Cidade Procurada': 'Blumenau', 'Bairros Procurados': 'Itoupava Norte, Velha', ...extra,
});

test('situacaoAutorizacao: prazo padrão de 120 dias, vencendo, vencida e ok', () => {
  // 01/09/2026 + 120 dias = 29/12/2026 → faltam 80 dias em 10/10 → ok
  const ok = crm.situacaoAutorizacao(imovel(), HOJE, 15);
  assert.equal(ok.estado, 'ok');
  assert.equal(ok.vencimento, '30/12/2026');
  // prazo de 50 dias → vence 20/10 → faltam 10 → vencendo
  assert.equal(crm.situacaoAutorizacao(imovel({ 'Prazo Autorização (dias)': '50' }), HOJE, 15).estado, 'vencendo');
  // prazo de 30 dias → venceu em 01/10 → vencida (-9)
  const v = crm.situacaoAutorizacao(imovel({ 'Prazo Autorização (dias)': '30' }), HOJE, 15);
  assert.equal(v.estado, 'vencida');
  assert.equal(v.diasRestantes, -9);
});

test('situacaoAutorizacao: ignora sem autorização, sem data, Vendido e Cancelado', () => {
  assert.equal(crm.situacaoAutorizacao(imovel({ 'Autorização Venda': 'Não' }), HOJE), null);
  assert.equal(crm.situacaoAutorizacao(imovel({ 'Data Autorização': '' }), HOJE), null);
  assert.equal(crm.situacaoAutorizacao(imovel({ 'Status Imóvel': 'Vendido' }), HOJE), null);
  assert.equal(crm.situacaoAutorizacao(imovel({ 'Status Imóvel': 'Cancelado' }), HOJE), null);
});

test('camposNovosImovel: padrão na criação, mantém o original quando ausente, valida', () => {
  assert.deepEqual(crm.camposNovosImovel({}), ['Captação', '', '', '', '', '']);
  const orig = imovel();
  const mantido = crm.camposNovosImovel({}, orig);
  assert.equal(mantido[0], 'Anunciado');
  assert.equal(mantido[1], '01/09/2026');
  assert.equal(mantido[5], 'https://exemplo.test/fotos');
  const novo = crm.camposNovosImovel({ gestao: { status: 'Vendido', dataAutorizacao: '2026-10-05', prazoDias: 90 }, imovel: { area: '120', descricao: 'ok', linkFotos: 'https://a.test/x' } }, orig);
  assert.equal(novo[0], 'Vendido');
  assert.equal(novo[1], '05/10/2026');
  assert.equal(novo[2], '90');
  assert.throws(() => crm.camposNovosImovel({ imovel: { linkFotos: 'javascript:alert(1)' } }), crm.ErroValidacao);
  assert.throws(() => crm.camposNovosImovel({ gestao: { status: 'Qualquer' } }), crm.ErroValidacao);
  assert.throws(() => crm.camposNovosImovel({ gestao: { prazoDias: '0' } }), crm.ErroValidacao);
});

test('textoSeguro neutraliza fórmulas da planilha', () => {
  assert.equal(crm.textoSeguro('=SOMA(A1)').startsWith("'"), true);
  assert.equal(crm.textoSeguro('+55 47').startsWith("'"), true);
  assert.equal(crm.textoSeguro('texto normal'), 'texto normal');
});

test('camposNovosCliente: padrão, faixa de valor inválida e subtipos filtrados', () => {
  const v = crm.camposNovosCliente({});
  assert.equal(v.length, 7);
  assert.equal(v[0], 'Novo');
  assert.throws(() => crm.camposNovosCliente({ perfilBusca: { valorMinimo: '900000', valorMaximo: '500000' } }), crm.ErroValidacao);
  const p = crm.camposNovosCliente({ perfilBusca: { tipo: 'Residencial', subtipos: ['Casa', 'Nave'], cidade: 'Blumenau', bairros: ['Velha'] } });
  assert.equal(p[3], 'Residencial');
  assert.equal(p[4], 'Casa');
});

test('compatibilidade: combina, quase (valor até 10% fora) e não combina', () => {
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel()).nivel, 'combina');
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel({ 'Valor': 'R$ 950.000,00' })).nivel, 'quase');
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel({ 'Valor': 'R$ 1.500.000,00' })), null);
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel({ 'Bairro Imóvel': 'Garcia' })), null);
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel({ 'Cidade Imóvel': 'Itajaí' })), null);
  assert.equal(crm.avaliarCompatibilidade(cliente(), imovel({ 'Subtipo': 'Terreno' })), null);
  assert.equal(crm.avaliarCompatibilidade(cliente({ 'Tipo Procurado': '', 'Subtipos Procurados': '', 'Cidade Procurada': '', 'Bairros Procurados': '', 'Valor Mínimo': '', 'Valor Máximo': '' }), imovel()), null);
});

test('imoveisCompativeis / clientesCompativeis respeitam status e tipo do cliente, e não vazam dados sensíveis', () => {
  const imoveis = [imovel(), imovel({ 'ID': 'BC0022026', 'Status Imóvel': 'Vendido' })];
  const lista = crm.imoveisCompativeis(cliente(), imoveis);
  assert.deepEqual(lista.map((i) => i.id), ['BC0012026']);
  assert.equal(JSON.stringify(lista).includes('529.982'), false);
  const compradores = crm.clientesCompativeis(imovel(), [
    cliente(), cliente({ 'ID': 'CLI002', 'Tipo de Cliente': 'Vendedor' }), cliente({ 'ID': 'CLI003', 'Status Cliente': 'Inativo' }),
  ]);
  assert.deepEqual(compradores.map((c) => c.id), ['CLI001']);
  assert.deepEqual(crm.clientesCompativeis(imovel({ 'Status Imóvel': 'Cancelado' }), [cliente()]), []);
});

test('filtrarImoveis e filtrarClientes', () => {
  const rows = [imovel(), imovel({ 'ID': 'X2', 'Status Imóvel': 'Vendido', 'Cidade Imóvel': 'Itajaí', 'Valor': 'R$ 300.000,00' })];
  assert.equal(crm.filtrarImoveis(rows, { status: 'Vendido' }).length, 1);
  assert.equal(crm.filtrarImoveis(rows, { cidade: 'itajai' }).length, 1);
  assert.equal(crm.filtrarImoveis(rows, { valorMin: '500000' }).length, 1);
  assert.equal(crm.filtrarImoveis(rows, {}).length, 2);
  const cls = [cliente(), cliente({ 'ID': 'CLI9', 'Status Cliente': 'Fechado' })];
  assert.equal(crm.filtrarClientes(cls, { status: 'Fechado' }).length, 1);
});

// ── HTTP ──────────────────────────────────────────────────────────
async function comServidor(fn, dados = {}) {
  const srv = await iniciar({
    crmDeps: {
      buscarImoveis: async () => dados.imoveis ?? [imovel(), imovel({ 'ID': 'BC0032026', 'Prazo Autorização (dias)': '30', 'Nome / Razão Social': 'Outro Vendedor' })],
      buscarClientes: async () => dados.clientes ?? [cliente()],
      hoje: () => HOJE,
    },
  });
  try { await fn({ base: srv.base, tk: token('teste') }); } finally { await srv.fechar(); }
}

test('rotas do CRM exigem autenticação', async () => {
  await comServidor(async ({ base }) => {
    for (const rota of ['/alertas/autorizacoes', '/clientes/CLI001/imoveis-compativeis', '/imoveis/BC0012026/clientes-compativeis', '/imoveis/BC0012026/ficha']) {
      assert.equal((await req(base, 'GET', rota)).status, 401, rota);
    }
  });
});

test('GET /alertas/autorizacoes separa vencendo e vencidas', async () => {
  await comServidor(async ({ base, tk }) => {
    const r = await req(base, 'GET', '/alertas/autorizacoes?dias=15', { tk });
    assert.equal(r.status, 200);
    assert.equal(r.json.vencidas.length, 1);
    assert.equal(r.json.vencidas[0].id, 'BC0032026');
    assert.equal(r.json.vencendo.length, 0);
    assert.equal('cpf' in r.json.vencidas[0], false);
  });
});

test('compatíveis: 200, 404 e ID inválido', async () => {
  await comServidor(async ({ base, tk }) => {
    const a = await req(base, 'GET', '/clientes/CLI001/imoveis-compativeis', { tk });
    assert.equal(a.status, 200);
    assert.ok(a.json.data.length >= 1);
    assert.equal((await req(base, 'GET', '/clientes/CLI999/imoveis-compativeis', { tk })).status, 404);
    assert.equal((await req(base, 'GET', '/imoveis/BC0012026/clientes-compativeis', { tk })).json.data[0].id, 'CLI001');
    assert.equal((await req(base, 'GET', '/imoveis/..%2Fx/clientes-compativeis', { tk })).status, 400);
  });
});

test('ficha: PDF sem dados do vendedor nem rua; 404 e 409', async () => {
  await comServidor(async ({ base, tk }) => {
    const r = await req(base, 'GET', '/imoveis/BC0012026/ficha', { tk });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    assert.match(r.headers.get('content-disposition'), /ficha-BC0012026\.pdf/);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.buf.subarray(0, 4).toString(), '%PDF');
    const bruto = r.buf.toString('latin1');
    for (const proibido of ['Fulana', '529.982', 'Rua Secreta', '99.999', 'nota interna']) assert.equal(bruto.includes(proibido), false, proibido);
    assert.equal((await req(base, 'GET', '/imoveis/ZZ9992026/ficha', { tk })).status, 404);
  });
  await comServidor(async ({ base, tk }) => {
    assert.equal((await req(base, 'GET', '/imoveis/BC0012026/ficha', { tk })).status, 409);
  }, { imoveis: [imovel({ 'Status Imóvel': 'Vendido' })] });
});
