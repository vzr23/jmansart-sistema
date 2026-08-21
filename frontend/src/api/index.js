import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
});

// ── Imóveis ──────────────────────────────
export const criarImovel = (data) => api.post('/imovel', data);
export const listarImoveis = (q = '') => api.get('/imoveis', { params: q ? { q } : {} });
export const buscarSigla = (cidade) => api.get('/imoveis/sigla', { params: { cidade } });
export const deletarImovel = (id) => api.delete(`/imovel/${id}`);

// ── Clientes ─────────────────────────────
export const criarCliente = (data) => api.post('/cliente', data);
export const listarClientes = (q = '') => api.get('/clientes', { params: q ? { q } : {} });
export const deletarCliente = (id) => api.delete(`/cliente/${id}`);

// ── Movimentações ─────────────────────────
export const criarMovimentacao = (data) => api.post('/movimentacao', data);
export const listarMovimentacoes = (ref) => api.get('/movimentacoes', { params: { ref } });

export default api;
