# 🚀 Guia de Deployment — J.Mansart Sistema

## Backend — Railway

### 1. Criar projeto no Railway
1. Acesse [railway.app](https://railway.app)
2. Novo projeto → GitHub → Selecione `jmansart-sistema`
3. Escolha branch `main`

### 2. Configurar variáveis de ambiente no Railway

No painel do Railway, vá para **Variables** e adicione:

```env
PORT=3001
SPREADSHEET_ID=15BLBHc0watZaGCzhzItPDTRYmWa4UUoxAaGorIXUunQ
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"..."}
AUTH_USER=seu_usuario
AUTH_PASS=sua_senha_segura
AUTH_JWT_SECRET=sua_chave_secreta_aleatoria_32_caracteres
AUTH_EMAIL=notificacoes@jmansart.com
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=seu_app_password_gmail_16_caracteres
CORS_ORIGIN=https://jmansart-sistema.vercel.app
```

⚠️ **CORS_ORIGIN é crítico:** deve ser exatamente a URL do frontend no Vercel

### 3. Trigger de deploy
- Railway faz deploy automaticamente ao fazer push para `main`
- URL do backend: `https://jmansart-sistema.up.railway.app`

---

## Frontend — Vercel

### 1. Criar projeto no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Novo projeto → GitHub → Selecione `jmansart-sistema`
3. Framework: Vite
4. Root: `./frontend`

### 2. Configurar variáveis de ambiente no Vercel

No painel do Vercel, vá para **Settings → Environment Variables** e adicione:

```env
VITE_API_URL=https://jmansart-sistema.up.railway.app
```

⚠️ **VITE_API_URL é crítico:** deve ser exatamente a URL do backend no Railway

### 3. Trigger de deploy
- Vercel faz deploy automaticamente ao fazer push para `main`
- Selecione `frontend` como root directory durante setup
- URL do frontend: `https://jmansart-sistema.vercel.app`

---

## ✅ Checklist Pós-Deploy

- [ ] Backend rodando no Railway: `curl https://jmansart-sistema.up.railway.app/health`
  - Esperado: `{"status":"ok","ts":"2026-08-22T...Z"}`

- [ ] Frontend acessível: `https://jmansart-sistema.vercel.app`

- [ ] CORS funcionando:
  - DevTools Network → Qualquer POST
  - Deve ver OPTIONS 200 (preflight OK)
  - Depois POST 200 ou 401 (rejeição de credenciais, não CORS)

- [ ] Login funcionando:
  1. Entrar com usuário/senha
  2. Receber e-mail com código 2FA
  3. Digitar código e fazer login

---

## 🔐 Geração de Variáveis Seguras

### AUTH_JWT_SECRET (32+ caracteres aleatórios)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### EMAIL_PASS (Gmail App Password)
1. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Gere um novo app password para "Mail"
3. Copy os 16 caracteres (sem espaços)

### GOOGLE_CREDENTIALS
1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie service account
3. Gere JSON key
4. Stringify e adicione no Railway

---

## 🆘 Troubleshooting

### "Erro ao conectar com o servidor" no login
**Causa:** CORS_ORIGIN incorreto no backend ou VITE_API_URL incorreto no frontend
**Solução:** 
- Backend: Verifique se CORS_ORIGIN=https://jmansart-sistema.vercel.app
- Frontend: Verifique se VITE_API_URL=https://jmansart-sistema.up.railway.app

### 2FA não funciona
**Causa:** EMAIL_USER ou EMAIL_PASS inválidos
**Solução:**
- EMAIL_USER: deve ser um e-mail Gmail com 2FA ativado
- EMAIL_PASS: deve ser um App Password (16 caracteres), não a senha normal

### POST /health funciona, mas /auth/login retorna 500
**Causa:** Variáveis de autenticação faltando
**Solução:** Verifique no Railway se AUTH_USER, AUTH_PASS, AUTH_JWT_SECRET e AUTH_EMAIL estão definidas

---

## 📝 Notas Importantes

- Toda mudança em `backend/` → deploy automático no Railway
- Toda mudança em `frontend/` → deploy automático no Vercel
- Logs do Railway: Dashboard → Logs
- Logs do Vercel: Dashboard → Deployments → Selected Deployment → Logs
- Certifique-se de commitar mudanças no `.env.local` localmente, mas NÃO fazer commit de `.env` real (está em .gitignore)
