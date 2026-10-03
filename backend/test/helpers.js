'use strict';
// Utilitários dos testes HTTP. Tudo FICTÍCIO; nada acessa Google, e-mail ou o .env do projeto.
const jwt = require('jsonwebtoken');

process.env.AUTH_JWT_SECRET = 'segredo-somente-para-testes-0123456789';
const { criarApp } = require('../app');

function iniciar(opcoes = {}) {
  const app = criarApp({ corsOrigin: 'https://frontend.exemplo.test', ...opcoes });
  return new Promise((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve({
      base: `http://127.0.0.1:${srv.address().port}`,
      fechar: () => new Promise((r) => srv.close(r)),
    }));
  });
}

const token = (user = 'teste', opcoes = {}) => jwt.sign({ user }, process.env.AUTH_JWT_SECRET, { expiresIn: '30m', ...opcoes });

/** Faz uma requisição. `ip` simula o cliente atrás do proxy (X-Forwarded-For, com 1 salto confiável). */
async function req(base, metodo, caminho, { tk, corpo, ip, cabecalhos = {}, bruto } = {}) {
  const headers = { ...cabecalhos };
  if (tk) headers.Authorization = `Bearer ${tk}`;
  if (ip) headers['X-Forwarded-For'] = ip;
  let body;
  if (bruto !== undefined) body = bruto;
  else if (corpo !== undefined) { body = JSON.stringify(corpo); headers['Content-Type'] ??= 'application/json'; }
  const r = await fetch(base + caminho, { method: metodo, headers, body });
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null;
  if ((r.headers.get('content-type') || '').includes('json')) { try { json = JSON.parse(buf.toString('utf8')); } catch { /* ignora */ } }
  return { status: r.status, headers: r.headers, buf, json };
}

/** Captura tudo que for escrito via console.* durante um teste. */
function capturarConsole() {
  const linhas = [];
  const originais = {};
  for (const m of ['log', 'info', 'warn', 'error']) {
    originais[m] = console[m];
    console[m] = (...a) => linhas.push(a.map((x) => (x instanceof Error ? `${x.stack}` : typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  }
  return { linhas, restaurar: () => { for (const m of Object.keys(originais)) console[m] = originais[m]; } };
}

module.exports = { iniciar, token, req, capturarConsole, jwt };
