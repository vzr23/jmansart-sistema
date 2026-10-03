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
TRUST_PROXY_HOPS=1
CONTRATO_MARCA_MINUTA=true
```

⚠️ **CORS_ORIGIN é obrigatório e crítico:** deve ser exatamente a URL do frontend no Vercel, sem barra no final e sem caminho.
**O servidor se recusa a iniciar** se `CORS_ORIGIN` faltar (ou, em produção, se for `*`). Confirme que a variável existe no Railway **antes** do deploy desta versão, senão o serviço não sobe.

- `TRUST_PROXY_HOPS` (opcional, padrão `1`): quantos proxies ficam na frente do backend. No Railway é 1. Os limites por IP dependem disto (veja a seção abaixo).
- `CONTRATO_MARCA_MINUTA` (opcional, padrão `true`): marca "MINUTA" nos PDFs enquanto o texto jurídico não for aprovado. Use `false` para remover.

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

- [ ] Rotas de contrato protegidas (esperado: **401** e `Cache-Control: no-store`):
  `curl -i https://jmansart-sistema.up.railway.app/contratos/autorizacao-venda/imovel/QUALQUERID`

- [ ] Login funcionando:
  1. Entrar com usuário/senha
  2. Receber e-mail com código 2FA
  3. Digitar código e fazer login

---

## 🛡️ Limites de segurança e estado em memória

⚠️ **O estado de segurança fica EM MEMÓRIA do processo** e **só funciona com UMA instância** do backend (réplicas = 1 no Railway):

- códigos de verificação (OTP) pendentes;
- contadores de erros por usuário e por IP, e os bloqueios temporários;
- limites de requisições das rotas de contrato.

Consequências:

- **Reinício ou novo deploy no Railway zera tudo:** os códigos pendentes deixam de valer (o usuário faz login de novo) e os bloqueios/contadores recomeçam do zero.
- **Com mais de uma instância o login quebra** (o código gerado em uma instância não vale na outra) e os limites passam a valer por instância. Se um dia for preciso escalar, mova esse estado para um armazenamento compartilhado (ex.: Redis).

Valores atuais (ver `backend/config/seguranca.js`):

| Proteção | Regra |
|---|---|
| Código OTP | 6 dígitos, validade de 5 minutos, uso único; **invalidado após 5 erros** |
| Erros de código | 10 por usuário e 20 por IP em 15 min → bloqueio de 15 min. **Pedir novo código não zera estes contadores** |
| Pedidos de código | 5 por usuário e 10 por IP em 15 min |
| Senha errada no login | 10 por usuário e 10 por IP em 15 min → bloqueio de 15 min |
| Rotas de contrato | 40 requisições por usuário e 80 por IP em 10 min (429 com `Retry-After`) |
| Tamanho do corpo | 10 KB em `/auth`, 32 KB em `/contratos`, 2 MB nas demais rotas |

**IP do cliente:** atrás do Railway o backend usa `X-Forwarded-For` com 1 salto confiável (`TRUST_PROXY_HOPS=1`). Se esse número estiver errado, ou todos os clientes parecerão ter o mesmo IP (o primeiro bloqueio travaria todo mundo) ou o IP poderá ser forjado. Depois de publicar, teste: erre a senha 10 vezes pelo celular no 4G e confirme que o login continua funcionando pelo computador no Wi-Fi.

## 📄 Gerador de contratos (Autorização para Venda)

- Rotas (todas exigem JWT): `GET /contratos/autorizacao-venda/imovel/:id`, `POST /contratos/autorizacao-venda/previa`, `POST /contratos/autorizacao-venda`.
- O PDF é gerado **na hora, em memória** e entregue na resposta (`Cache-Control: no-store`). **Não é salvo** no servidor nem na planilha.
- O modelo do texto fica em `backend/templates/` (código do servidor, nunca em pasta pública).
- Único registro: uma linha em **Movimentações** com tipo "Contrato", usuário, data e ID do imóvel. Sem nome, CPF ou outro dado pessoal. Os logs também não trazem dados pessoais.
- Fontes embutidas: Liberation Serif (licença SIL OFL) em `backend/fonts/`.

### ⚠️ Ponto de atenção: exclusividade

- O gerador cobre **apenas "não exclusividade"** (fixo na tela e no servidor, que recusa qualquer outro valor).
- A cláusula 2.3 do modelo só vale sem exclusividade; para o caso com exclusividade falta o texto jurídico próprio, a definir com o advogado.
- Só liberar a opção "com exclusividade" na tela depois de existir esse texto (bloco alternativo no modelo + teste dos dois casos).

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

### Serviço não sobe no Railway, com erro de configuração de ambiente
**Causa:** `CORS_ORIGIN` ausente (agora é obrigatório), com barra no final, ou `*` em produção
**Solução:** defina `CORS_ORIGIN=https://jmansart-sistema.vercel.app` (a URL exata do frontend) e faça o deploy de novo

### "Muitas tentativas" (429) no login
**Causa:** limite de tentativas por usuário/IP atingido (o bloqueio dura 15 minutos)
**Solução:** aguarde; reiniciar o backend zera os contadores (use só se for realmente necessário)

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
