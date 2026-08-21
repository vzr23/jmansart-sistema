import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/imovel':   { target: 'http://localhost:3001', changeOrigin: true },
      '/imoveis':  { target: 'http://localhost:3001', changeOrigin: true },
      '/cliente':  { target: 'http://localhost:3001', changeOrigin: true },
      '/clientes':       { target: 'http://localhost:3001', changeOrigin: true },
      '/movimentacao':   { target: 'http://localhost:3001', changeOrigin: true },
      '/movimentacoes':  { target: 'http://localhost:3001', changeOrigin: true },
      '/health':         { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
