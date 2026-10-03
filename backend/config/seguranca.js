'use strict';
/**
 * Limites de segurança. O estado dos limitadores fica EM MEMÓRIA: reiniciar o processo (ex.: deploy/restart
 * no Railway) zera contadores e códigos OTP, e isto só é correto com UMA instância do backend.
 */
const MIN = 60 * 1000;

module.exports = Object.freeze({
  login: {
    // senha/usuário errados
    falhasPorUsuario: { max: 10, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
    falhasPorIp: { max: 10, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
  },
  otp: {
    ttlMs: 5 * MIN,
    maxErrosPorCodigo: 5, // o código é invalidado após 5 erros
    // Erros de código acumulam por usuário e por IP; pedir um novo código NÃO zera estes contadores.
    falhasPorUsuario: { max: 10, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
    falhasPorIp: { max: 20, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
    // Pedidos de código (evita enchente de e-mails)
    emissaoPorUsuario: { max: 5, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
    emissaoPorIp: { max: 10, janelaMs: 15 * MIN, bloqueioMs: 15 * MIN },
  },
  contratos: {
    porUsuario: { max: 40, janelaMs: 10 * MIN },
    porIp: { max: 80, janelaMs: 10 * MIN },
    limiteCorpo: '32kb',
  },
  limiteCorpoAuth: '10kb',
  limiteCorpoGeral: '2mb',
});
