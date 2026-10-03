'use strict';
/**
 * Contador por chave em janela fixa, com bloqueio temporário. Estado EM MEMÓRIA (uma instância do backend).
 *
 * Fluxo de uso:
 *   const st = lim.consultar(chave);       // { bloqueado, retryAfterSeg }
 *   if (st.bloqueado) -> recusar (429)
 *   ... executar ...
 *   lim.registrar(chave)                   // conta 1 ocorrência (falha, pedido, requisição)
 * Ao atingir `max` ocorrências dentro da janela, a chave fica bloqueada por `bloqueioMs`
 * (ou até o fim da janela, se `bloqueioMs` não for informado).
 * Nada zera o contador manualmente: ele só decai quando a janela termina.
 */
class LimitadorTentativas {
  constructor({ max, janelaMs, bloqueioMs, agora = Date.now, maxChaves = 10000 }) {
    if (!(max >= 1) || !(janelaMs > 0)) throw new RangeError('Limitador mal configurado');
    this.max = max;
    this.janelaMs = janelaMs;
    this.bloqueioMs = bloqueioMs;
    this.agora = agora;
    this.maxChaves = maxChaves;
    this.mapa = new Map();
  }

  consultar(chave) {
    const t = this.agora();
    const e = this.mapa.get(chave);
    if (e && t < e.bloqueadoAte) return { bloqueado: true, retryAfterSeg: Math.ceil((e.bloqueadoAte - t) / 1000) };
    return { bloqueado: false, retryAfterSeg: 0 };
  }

  registrar(chave) {
    const t = this.agora();
    let e = this.mapa.get(chave);
    if (!e || t >= e.fimJanela) {
      const bloqueadoAte = e ? e.bloqueadoAte : 0; // um bloqueio ativo sobrevive à troca de janela
      this.mapa.delete(chave);
      e = { contagem: 0, fimJanela: t + this.janelaMs, bloqueadoAte };
      this.mapa.set(chave, e);
    }
    e.contagem += 1;
    if (e.contagem >= this.max && t >= e.bloqueadoAte) {
      e.bloqueadoAte = t + (this.bloqueioMs ?? e.fimJanela - t);
    }
    if (this.mapa.size > this.maxChaves) this._podar(t);
    return this.consultar(chave);
  }

  /** Remove entradas vencidas; se ainda passar do teto, descarta as mais antigas (limita o uso de memória). */
  _podar(t) {
    for (const [k, e] of this.mapa) if (t >= e.fimJanela && t >= e.bloqueadoAte) this.mapa.delete(k);
    const alvo = Math.floor(this.maxChaves * 0.9);
    for (const k of this.mapa.keys()) {
      if (this.mapa.size <= alvo) break;
      this.mapa.delete(k);
    }
  }

  get tamanho() { return this.mapa.size; }
}

module.exports = { LimitadorTentativas };
