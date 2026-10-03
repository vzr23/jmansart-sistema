/**
 * Entrega do PDF: menu de compartilhar do celular (WhatsApp, e-mail...) e, se não der, download.
 * O PDF fica só em memória (Blob). Nada vai para localStorage, sessionStorage ou URL.
 */

function podeCompartilhar(arquivo) {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] });
  } catch {
    return false;
  }
}

export const compartilhamentoDisponivel = () =>
  podeCompartilhar(new File([new Blob(['%PDF'], { type: 'application/pdf' })], 'a.pdf', { type: 'application/pdf' }));

/** Baixa o PDF e libera o endereço temporário do Blob logo depois. */
export function baixarPdf(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Tenta o menu de compartilhar; se o aparelho não suportar (ou falhar), baixa.
 * Resultado: 'compartilhado' | 'cancelado' | 'baixado'.
 * Precisa ser chamado direto de um toque do usuário (exigência dos navegadores).
 */
export async function compartilharOuBaixar(blob, nome, titulo = 'Autorização para Venda') {
  const arquivo = new File([blob], nome, { type: 'application/pdf' });
  if (podeCompartilhar(arquivo)) {
    try {
      await navigator.share({ files: [arquivo], title: titulo });
      return 'compartilhado';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelado';
      // qualquer outra falha: cai no download
    }
  }
  baixarPdf(blob, nome);
  return 'baixado';
}
