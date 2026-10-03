'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { iniciar, token, req, capturarConsole, jwt } = require('./helpers');
const SEG = require('../config/seguranca');
const { TIPO_MOVIMENTACAO, DESCRICAO_MOVIMENTACAO } = require('../routes/contratos');

// ── Dados FICTÍCIOS ────────────────────────────────────────────────
const NOME = 'Maria Aparecida Sigilosa Teste';
const CPF = '529.982.247-25';
const RG = '9.876.543';
const RUA = 'Rua Confidencial de Exemplo';
const LINHA = {
  'ID': 'BC0012026', 'Tipo Vendedor': 'PF', 'Nome / Razão Social': NOME, 'CPF / CNPJ': CPF, 'RG': RG,
  'Estado Civil': 'solteira', 'Cônjuge': '', 'Logradouro Vendedor': RUA, 'Número Vendedor': '10', 'Complemento Vendedor': 'ap 2',
  'Bairro Vendedor': 'Centro', 'Cidade Vendedor': 'Blumenau', 'UF Vendedor': 'SC', 'CEP Vendedor': '89000-000',
  'Matrícula': '12.345', 'Tipo': 'Residencial', 'Subtipo': 'Casa', 'Logradouro Imóvel': 'Rua do Imóvel', 'Número Imóvel': '5',
  'Complemento Imóvel': '', 'Bairro Imóvel': 'Bairro X', 'Cidade Imóvel': 'Blumenau', 'UF Imóvel': 'SC', 'Valor': 'R$ 800.000,00',
  'Telefone': '(47) 90000-0000', 'E-mail': 'sigiloso@exemplo.test', 'Observações': 'nota interna',
};
const CORPO = {
  imovel_id: 'bc0012026',
  proprietarios: [{ nome: NOME, genero: 'F', nacionalidade: 'brasileira', profissao: 'empresária', estado_civil: 'solteira', cpf: CPF, rua: RUA, numero: '10', bairro: 'Centro', cidade: 'Blumenau', uf: 'SC', cep: '89000-000' }],
  imovel: { matricula: '12.345', comarca: 'Blumenau', tipo_imovel: 'casa', area_m2: '300', logradouro_imovel: 'Rua do Imóvel, 5', bairro_imovel: 'Bairro X', municipio_imovel: 'Blumenau', uf_imovel: 'SC' },
  condicoes: { valor: 'R$ 800.000,00', cidade_assinatura: 'Blumenau', data_assinatura: '2026-10-01' },
};
const SENSIVEIS = [NOME, 'Sigilosa', CPF, '52998224725', RG, RUA, '12.345', 'sigiloso@exemplo.test'];

function deps({ falharMovimentacao = false, falharBusca = false } = {}) {
  const chamadas = { buscar: 0, registrar: [] };
  return {
    chamadas,
    contratosDeps: {
      buscarImovel: async (id) => {
        chamadas.buscar++;
        if (falharBusca) throw new Error(`falha na planilha ao ler CPF ${CPF} de ${NOME}`);
        return id.toLowerCase() === 'bc0012026' ? LINHA : null;
      },
      registrarMovimentacao: async (d) => {
        if (falharMovimentacao) throw new Error(`erro com ${NOME}`);
        chamadas.registrar.push(d);
        return { id: 'MOV0001' };
      },
    },
  };
}
async function comServidor(opcoes, fn) {
  const d = deps(opcoes?.deps);
  const srv = await iniciar({ contratosDeps: d.contratosDeps, ...(opcoes?.app ?? {}) });
  try { await fn({ base: srv.base, d, tk: token('teste') }); } finally { await srv.fechar(); }
}

const ROTAS = [
  ['GET', '/contratos/autorizacao-venda/imovel/BC0012026', undefined],
  ['POST', '/contratos/autorizacao-venda/previa', CORPO],
  ['POST', '/contratos/autorizacao-venda', CORPO],
];

test('401 EXPLÍCITO: sem token, token inválido, esquema errado, outro segredo, expirado — em todas as rotas de contrato', async () => {
  await comServidor({}, async ({ base, d }) => {
    const tokens = {
      'sem Authorization': {},
      'Bearer vazio': { cabecalhos: { Authorization: 'Bearer ' } },
      'Bearer lixo': { cabecalhos: { Authorization: 'Bearer isto.nao.e-jwt' } },
      'esquema Basic': { cabecalhos: { Authorization: 'Basic dGVzdGU6c2VuaGE=' } },
      'assinado com outro segredo': { tk: jwt.sign({ user: 'teste' }, 'outro-segredo-qualquer', { expiresIn: '30m' }) },
      'expirado': { tk: jwt.sign({ user: 'teste' }, process.env.AUTH_JWT_SECRET, { expiresIn: -10 }) },
      'alg none': { cabecalhos: { Authorization: `Bearer ${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from('{"user":"teste"}').toString('base64url')}.` } },
    };
    for (const [metodo, caminho, corpo] of ROTAS) {
      for (const [nome, extra] of Object.entries(tokens)) {
        const r = await req(base, metodo, caminho, { corpo, ...extra });
        assert.equal(r.status, 401, `${metodo} ${caminho} com token "${nome}" devia dar 401, deu ${r.status}`);
        assert.equal(r.headers.get('cache-control'), 'no-store');
      }
    }
    assert.equal(d.chamadas.buscar, 0, 'a planilha não pode ser consultada sem autenticação');
    assert.equal(d.chamadas.registrar.length, 0);
  });
});

test('401 também para caminhos desconhecidos sob /contratos e não vaza nada', async () => {
  await comServidor({}, async ({ base }) => {
    const r = await req(base, 'GET', '/contratos/qualquer/coisa');
    assert.equal(r.status, 401);
    assert.deepEqual(Object.keys(r.json), ['error']);
  });
});

test('Cache-Control: no-store (+ nosniff) em TODAS as respostas de /contratos', async () => {
  await comServidor({}, async ({ base, tk }) => {
    const respostas = [
      await req(base, 'GET', ROTAS[0][1], { tk }),
      await req(base, 'POST', ROTAS[1][1], { tk, corpo: CORPO }),
      await req(base, 'POST', ROTAS[2][1], { tk, corpo: CORPO }),
      await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, proprietarios: [] } }), // 400
      await req(base, 'GET', '/contratos/autorizacao-venda/imovel/ZZ9999999', { tk }), // 404
      await req(base, 'GET', '/contratos/rota/inexistente', { tk }), // 404
    ];
    assert.deepEqual(respostas.map((r) => r.status), [200, 200, 200, 400, 404, 404]);
    for (const r of respostas) {
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    }
  });
});

test('GET imóvel: dados mapeados, ID sem diferenciar maiúsculas, nada além do necessário', async () => {
  await comServidor({}, async ({ base, tk }) => {
    const r = await req(base, 'GET', '/contratos/autorizacao-venda/imovel/bc0012026', { tk });
    assert.equal(r.status, 200);
    assert.equal(r.json.id, 'BC0012026');
    assert.equal(r.json.proprietario.nome, NOME);
    assert.equal(r.json.proprietario.numero, '10, ap 2');
    assert.equal(r.json.imovel.tipo_imovel, 'casa');
    assert.equal(r.json.imovel.logradouro_imovel, 'Rua do Imóvel, 5');
    assert.deepEqual(r.json.padroes, { comissao_pct: 6, prazo_dias: 120, multa_pct: 2, juros_pct_mes: 1, exclusividade: 'nao' });
    const bruto = JSON.stringify(r.json);
    for (const naoDeve of ['90000-0000', 'sigiloso@exemplo.test', 'nota interna']) assert.ok(!bruto.includes(naoDeve), `vazou: ${naoDeve}`);

    assert.equal((await req(base, 'GET', '/contratos/autorizacao-venda/imovel/XX0010000', { tk })).status, 404);
    assert.equal((await req(base, 'GET', '/contratos/autorizacao-venda/imovel/a;b', { tk })).status, 400);
    assert.equal((await req(base, 'GET', `/contratos/autorizacao-venda/imovel/${'A'.repeat(60)}`, { tk })).status, 400);
  });
});

test('vendedor PJ: só AVISA (não bloqueia)', async () => {
  const d = deps();
  d.contratosDeps.buscarImovel = async () => ({ ...LINHA, 'Tipo Vendedor': 'PJ' });
  const srv = await iniciar({ contratosDeps: d.contratosDeps });
  try {
    const r = await req(srv.base, 'GET', '/contratos/autorizacao-venda/imovel/BC0012026', { tk: token() });
    assert.equal(r.status, 200);
    assert.equal(r.json.tipo_vendedor, 'PJ');
    assert.match(r.json.avisos[0], /pessoa jurídica/);
  } finally { await srv.fechar(); }
});

test('prévia: valores por extenso e aviso de CPF; dados inválidos => 400 com a lista de campos', async () => {
  await comServidor({}, async ({ base, tk, d }) => {
    const ok = await req(base, 'POST', ROTAS[1][1], { tk, corpo: { ...CORPO, proprietarios: [{ ...CORPO.proprietarios[0], cpf: '111.111.111-11' }] } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.resumo.valor_extenso, 'oitocentos mil reais');
    assert.equal(ok.json.resumo.data_assinatura, '1º de outubro de 2026');
    assert.equal(ok.json.avisos[0].campo, 'proprietarios[0].cpf');
    assert.equal(typeof ok.json.marca_minuta, 'boolean');

    const ruim = await req(base, 'POST', ROTAS[1][1], { tk, corpo: { ...CORPO, condicoes: { ...CORPO.condicoes, valor: '0' } } });
    assert.equal(ruim.status, 400);
    assert.equal(ruim.json.erros[0].campo, 'condicoes.valor');
    assert.equal(d.chamadas.buscar, 0, 'a prévia não consulta a planilha');
  });
});

test('gerar: PDF em resposta, no-store, e UMA movimentação mínima sem dados pessoais', async () => {
  await comServidor({}, async ({ base, tk, d }) => {
    const r = await req(base, 'POST', ROTAS[2][1], { tk, corpo: CORPO });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/pdf');
    assert.equal(r.headers.get('content-disposition'), 'attachment; filename="autorizacao-venda-BC0012026.pdf"');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('x-registro-movimentacao'), 'ok');
    assert.equal(r.buf.subarray(0, 5).toString(), '%PDF-');

    assert.equal(d.chamadas.registrar.length, 1);
    const mov = d.chamadas.registrar[0];
    assert.deepEqual(mov, { usuario: 'teste', tipo: TIPO_MOVIMENTACAO, idReferencia: 'BC0012026', nomeReferencia: '', descricao: DESCRICAO_MOVIMENTACAO });
    assert.equal(TIPO_MOVIMENTACAO, 'Contrato');
    assert.equal(DESCRICAO_MOVIMENTACAO, 'Contrato gerado: Autorização para Venda');
    const bruto = JSON.stringify(mov);
    for (const s of SENSIVEIS) assert.ok(!bruto.includes(s), `movimentação contém dado pessoal: ${s}`);
  });
});

test('imóvel inexistente => 404 e NADA é registrado; dados inválidos => 400 e NADA é registrado', async () => {
  await comServidor({}, async ({ base, tk, d }) => {
    assert.equal((await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, imovel_id: 'ZZ9999999' } })).status, 404);
    const sem = await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, imovel_id: undefined } });
    assert.equal(sem.status, 400);
    const ruim = await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, proprietarios: [{ ...CORPO.proprietarios[0], genero: 'X', cpf: '12' }] } });
    assert.equal(ruim.status, 400);
    assert.ok(ruim.json.erros.length >= 2);
    assert.equal(d.chamadas.registrar.length, 0);
  });
});

test('LOGS sem dado pessoal: sucesso, validação, 404, falha ao registrar e falha inesperada', async () => {
  const cap = capturarConsole();
  try {
    await comServidor({ deps: { falharMovimentacao: true } }, async ({ base, tk }) => {
      const r = await req(base, 'POST', ROTAS[2][1], { tk, corpo: CORPO });
      assert.equal(r.status, 200, 'o contrato é entregue mesmo se o registro falhar');
      assert.equal(r.headers.get('x-registro-movimentacao'), 'falhou');
      assert.equal(r.buf.subarray(0, 5).toString(), '%PDF-');
      await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, proprietarios: [{ ...CORPO.proprietarios[0], cpf: '1' }] } });
      await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, imovel_id: 'ZZ9999999' } });
    });
    await comServidor({ deps: { falharBusca: true } }, async ({ base, tk }) => {
      const r = await req(base, 'POST', ROTAS[2][1], { tk, corpo: CORPO });
      assert.equal(r.status, 500);
      assert.deepEqual(r.json, { error: 'Erro interno' });
      for (const s of SENSIVEIS) assert.ok(!r.buf.toString().includes(s));
      const g = await req(base, 'GET', ROTAS[0][1], { tk });
      assert.equal(g.status, 500);
    });
  } finally { cap.restaurar(); }
  const log = cap.linhas.join('\n');
  assert.ok(log.length > 0, 'esperava logs genéricos de erro');
  assert.match(log, /\[contrato\] falha ao registrar a movimentação/);
  for (const s of SENSIVEIS) assert.ok(!log.includes(s), `LOG contém dado pessoal: ${s}`);
  assert.ok(!log.includes('teste'), 'o log não precisa do usuário');
});

test('corpo grande demais => 413 genérico (e só DEPOIS de autenticar); sem token => 401', async () => {
  await comServidor({}, async ({ base, tk, d }) => {
    const grande = { ...CORPO, lixo: 'x'.repeat(40 * 1024) };
    const r = await req(base, 'POST', ROTAS[2][1], { tk, corpo: grande });
    assert.equal(r.status, 413);
    assert.deepEqual(r.json, { error: 'Corpo da requisição grande demais' });
    assert.equal((await req(base, 'POST', ROTAS[2][1], { corpo: grande })).status, 401);
    const limiteOk = await req(base, 'POST', ROTAS[2][1], { tk, corpo: { ...CORPO, lixo: 'x'.repeat(10 * 1024) } });
    assert.equal(limiteOk.status, 200);
    assert.equal(d.chamadas.registrar.length, 1);
  });
});

test('JSON malformado => 400 genérico, sem ecoar nem logar trecho do corpo; Content-Type errado => 415', async () => {
  const cap = capturarConsole();
  try {
    await comServidor({}, async ({ base, tk }) => {
      const r = await req(base, 'POST', ROTAS[2][1], { tk, bruto: '{"proprietarios":[{"nome":"SEGREDO-NO-CORPO', cabecalhos: { 'Content-Type': 'application/json' } });
      assert.equal(r.status, 400);
      assert.deepEqual(r.json, { error: 'Requisição inválida' });
      const t = await req(base, 'POST', ROTAS[2][1], { tk, bruto: 'nome=SEGREDO', cabecalhos: { 'Content-Type': 'text/plain' } });
      assert.equal(t.status, 415);
      const arr = await req(base, 'POST', ROTAS[2][1], { tk, corpo: [1, 2] });
      assert.equal(arr.status, 400);
    });
  } finally { cap.restaurar(); }
  assert.ok(!cap.linhas.join('\n').includes('SEGREDO'));
});

test('limite de requisições por usuário: excedeu => 429 com Retry-After; outro usuário segue livre', async () => {
  const limites = { ...SEG, contratos: { ...SEG.contratos, porUsuario: { max: 3, janelaMs: 60_000 }, porIp: { max: 100, janelaMs: 60_000 } } };
  await comServidor({ app: { limites } }, async ({ base, tk }) => {
    for (let i = 0; i < 3; i++) assert.equal((await req(base, 'GET', ROTAS[0][1], { tk })).status, 200);
    const r = await req(base, 'GET', ROTAS[0][1], { tk });
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers.get('retry-after')) > 0);
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal((await req(base, 'GET', ROTAS[0][1], { tk: token('outro-usuario') })).status, 200);
  });
});

test('limite de requisições por IP: vale mesmo trocando de usuário', async () => {
  const limites = { ...SEG, contratos: { ...SEG.contratos, porUsuario: { max: 100, janelaMs: 60_000 }, porIp: { max: 2, janelaMs: 60_000 } } };
  await comServidor({ app: { limites } }, async ({ base }) => {
    assert.equal((await req(base, 'GET', ROTAS[0][1], { tk: token('a'), ip: '203.0.113.20' })).status, 200);
    assert.equal((await req(base, 'GET', ROTAS[0][1], { tk: token('b'), ip: '203.0.113.20' })).status, 200);
    assert.equal((await req(base, 'GET', ROTAS[0][1], { tk: token('c'), ip: '203.0.113.20' })).status, 429);
    assert.equal((await req(base, 'GET', ROTAS[0][1], { tk: token('c'), ip: '203.0.113.21' })).status, 200);
  });
});

test('o contrato NÃO é gravado em disco (nenhum arquivo novo no backend)', async () => {
  const raiz = path.join(__dirname, '..');
  const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (['node_modules', 'exemplos'].includes(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [`${p}:${fs.statSync(p).size}`];
  }).sort();
  const antes = listar(raiz);
  await comServidor({}, async ({ base, tk }) => { await req(base, 'POST', ROTAS[2][1], { tk, corpo: CORPO }); });
  assert.deepEqual(listar(raiz), antes);
});

test('CORS: libera só a origem configurada e expõe os cabeçalhos necessários', async () => {
  await comServidor({}, async ({ base }) => {
    const ok = await req(base, 'OPTIONS', '/contratos/autorizacao-venda', { cabecalhos: { Origin: 'https://frontend.exemplo.test', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'https://frontend.exemplo.test');
    const outra = await req(base, 'OPTIONS', '/contratos/autorizacao-venda', { cabecalhos: { Origin: 'https://site-malicioso.test', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(outra.headers.get('access-control-allow-origin'), null);
    const exp = await req(base, 'GET', '/health', { cabecalhos: { Origin: 'https://frontend.exemplo.test' } });
    assert.match(exp.headers.get('access-control-expose-headers'), /Content-Disposition/);
  });
});
