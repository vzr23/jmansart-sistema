'use strict';
/** Validação das variáveis de ambiente na partida. O servidor recusa iniciar se algo crítico faltar. */
const OBRIGATORIAS = ['AUTH_USER', 'AUTH_PASS', 'AUTH_JWT_SECRET', 'AUTH_EMAIL', 'EMAIL_USER', 'EMAIL_PASS', 'CORS_ORIGIN'];

const parseOrigens = (valor) => String(valor ?? '').split(',').map((o) => o.trim()).filter(Boolean);

function validarAmbiente(env = process.env) {
  const problemas = [];
  const faltando = OBRIGATORIAS.filter((v) => !String(env[v] ?? '').trim());
  for (const v of faltando) problemas.push(`${v} não definida`);

  if (!faltando.includes('CORS_ORIGIN')) {
    const producao = env.NODE_ENV === 'production' || Boolean(env.RAILWAY_ENVIRONMENT || env.RAILWAY_ENVIRONMENT_NAME);
    for (const origem of parseOrigens(env.CORS_ORIGIN)) {
      if (origem === '*') {
        if (producao) problemas.push('CORS_ORIGIN="*" não é permitido em produção: informe a URL exata do frontend');
      } else if (!/^https?:\/\/[^/\s]+$/.test(origem)) {
        problemas.push('CORS_ORIGIN deve ser uma origem (ex.: https://jmansart-sistema.vercel.app), sem barra no final nem caminho');
      }
    }
  }
  return { ok: problemas.length === 0, problemas };
}

module.exports = { validarAmbiente, parseOrigens, OBRIGATORIAS };
