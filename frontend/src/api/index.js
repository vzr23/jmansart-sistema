import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

// ── Adiciona token em todas as requisições ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jmansart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token expirado → volta para login ──────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jmansart_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Imóveis ──────────────────────────────
export const criarImovel     = (data)     => api.post('/imovel', data);
export const listarImoveis   = (q = '', page = 1, limit = 10) => api.get('/imoveis', { params: { ...(q ? { q } : {}), page, limit } });
export const buscarSigla     = (cidade)   => api.get('/imoveis/sigla', { params: { cidade } });
export const atualizarImovel = (id, data) => api.put(`/imovel/${id}`, data);
export const deletarImovel   = (id)       => api.delete(`/imovel/${id}`);

// ── Clientes ─────────────────────────────
export const criarCliente     = (data)     => api.post('/cliente', data);
export const listarClientes   = (q = '', page = 1, limit = 10) => api.get('/clientes', { params: { ...(q ? { q } : {}), page, limit } });
export const atualizarCliente = (id, data) => api.put(`/cliente/${id}`, data);
export const deletarCliente   = (id)       => api.delete(`/cliente/${id}`);

// ── Movimentações ─────────────────────────
export const criarMovimentacao  = (data) => api.post('/movimentacao', data);
export const listarMovimentacoes = (ref) => api.get('/movimentacoes', { params: { ref } });

// ── Contrato: Autorização para Venda ──────
// Os dados pessoais só trafegam no corpo (POST); a URL leva apenas o ID do imóvel.
export const buscarImovelContrato = (id)    => api.get(`/contratos/autorizacao-venda/imovel/${encodeURIComponent(id)}`);
export const previaContrato       = (dados) => api.post('/contratos/autorizacao-venda/previa', dados);
export const gerarContratoPdf     = (dados) => api.post('/contratos/autorizacao-venda', dados, { responseType: 'blob', timeout: 30000 });

/** Extrai { status, mensagem, erros[] } de um erro do axios (inclusive quando a resposta veio como Blob). */
export async function lerErroApi(err) {
  const r = err?.response;
  if (!r) {
    return {
      status: 0,
      mensagem: err?.code === 'ECONNABORTED' ? 'O servidor demorou demais. Tente novamente.' : 'Sem conexão com o servidor.',
      erros: [],
    };
  }
  let corpo = r.data;
  if (typeof Blob !== 'undefined' && corpo instanceof Blob) {
    try { corpo = JSON.parse(await corpo.text()); } catch { corpo = {}; }
  }
  return {
    status: r.status,
    mensagem: (corpo && typeof corpo.error === 'string' && corpo.error) || 'Não foi possível concluir o pedido.',
    erros: Array.isArray(corpo?.erros) ? corpo.erros : [],
  };
}

export default api;
