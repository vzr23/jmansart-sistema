'use strict';
// Códigos OTP EM MEMÓRIA (chave: usuário normalizado). Reiniciar o processo invalida os códigos pendentes.
// Uma instância do backend apenas: com várias instâncias o código gerado em uma não vale na outra.
const crypto = require('crypto');

function iguaisEmTempoConstante(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function criarOtpStore({ agora = Date.now, ttlMs = 5 * 60 * 1000, maxErros = 5 } = {}) {
  const store = new Map();

  /** Gera um código novo (substitui o anterior; os erros por CÓDIGO recomeçam — os limites por usuário/IP, não). */
  function salvar(usuario) {
    const code = String(crypto.randomInt(100000, 1000000));
    store.set(usuario, { code, expiraEm: agora() + ttlMs, erros: 0 });
    return code;
  }

  /** @returns {{ok: boolean, motivo?: 'sem_codigo'|'expirado'|'incorreto'|'invalidado'}} */
  function verificar(usuario, codigo) {
    const e = store.get(usuario);
    if (!e) return { ok: false, motivo: 'sem_codigo' };
    if (agora() > e.expiraEm) {
      store.delete(usuario);
      return { ok: false, motivo: 'expirado' };
    }
    if (iguaisEmTempoConstante(String(codigo ?? '').trim(), e.code)) {
      store.delete(usuario); // uso único
      return { ok: true };
    }
    e.erros += 1;
    if (e.erros >= maxErros) {
      store.delete(usuario); // invalidado: nem o código correto vale mais
      return { ok: false, motivo: 'invalidado' };
    }
    return { ok: false, motivo: 'incorreto' };
  }

  return { salvar, verificar };
}

module.exports = { criarOtpStore, iguaisEmTempoConstante };
