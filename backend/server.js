require('dotenv').config();
const { validarAmbiente } = require('./config/env');

// ── Validação de Variáveis de Ambiente (recusa iniciar se algo crítico faltar, inclusive CORS_ORIGIN) ───
const ambiente = validarAmbiente(process.env);
if (!ambiente.ok) {
  console.error(`\n❌ ERRO: configuração de ambiente inválida:\n   - ${ambiente.problemas.join('\n   - ')}\n`);
  process.exit(1);
}

const { criarApp } = require('./app');

const PORT = process.env.PORT || 3001;
const hops = Number.parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10);
const app = criarApp({
  corsOrigin: process.env.CORS_ORIGIN,
  trustProxyHops: Number.isInteger(hops) && hops >= 0 ? hops : 1,
});

app.listen(PORT, () => {
  console.log(`\n🏠  J.Mansart Backend em http://localhost:${PORT}\n`);
});
