import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

// ── Adiciona token em todas as requisições ──
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('jmansart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token expirado → volta para login ──────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('jmansart_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Imóveis ──────────────────────────────
export const criarImovel     = (data)     => api.post('/imovel', data);
export const listarImoveis   = (q = '')   => api.get('/imoveis', { params: q ? { q } : {} });
export const buscarSigla     = (cidade)   => api.get('/imoveis/sigla', { params: { cidade } });
export const atualizarImovel = (id, data) => api.put(`/imovel/${id}`, data);
export const deletarImovel   = (id)       => api.delete(`/imovel/${id}`);

// ── Clientes ─────────────────────────────
export const criarCliente     = (data)     => api.post('/cliente', data);
export const listarClientes   = (q = '')   => api.get('/clientes', { params: q ? { q } : {} });
export const atualizarCliente = (id, data) => api.put(`/cliente/${id}`, data);
export const deletarCliente   = (id)       => api.delete(`/cliente/${id}`);

// ── Movimentações ─────────────────────────
export const criarMovimentacao  = (data) => api.post('/movimentacao', data);
export const listarMovimentacoes = (ref) => api.get('/movimentacoes', { params: { ref } });

export default api;
