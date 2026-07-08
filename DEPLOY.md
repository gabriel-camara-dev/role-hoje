# Deploy — role-hoje (backend) na Hostinger VPS

> Troque `rolehoje.com` (frontend) e `api.rolehoje.com` (backend) pelo seu domínio real.
> Comandos testados em **Ubuntu 24.04 (VPS KVM)**.

---

## A. Comprar/provisionar o VPS na Hostinger

1. Painel da Hostinger → **VPS** (KVM). Um plano **KVM 1** (1 vCPU / 4 GB) já roda tranquilo pro início; se apertar, dá pra escalar depois.
2. **Sistema operacional**: escolha **Ubuntu 24.04** (limpo, sem painel). Se oferecer "template com Docker", pode escolher — economiza um passo.
3. **Localização**: mais perto do público (Brasil/São Paulo se tiver; senão EUA-leste).
4. Defina a **senha de root** e (recomendado) suba sua **chave SSH pública**.
5. Anote o **IP público** do VPS.

## B. DNS (aponta o domínio pro VPS)

No seu provedor de DNS (Hostinger/Cloudflare/Registro.br), crie:

| Tipo | Nome  | Valor            |
|------|-------|------------------|
| A    | `api` | IP do VPS        |
| A    | `@` ou `www` | IP do VPS (se for servir o front no mesmo VPS) |

> O frontend pode ficar em Vercel/Netlify/Cloudflare Pages (mais simples) — nesse caso o `@`/`www` aponta pra lá, e só o `api` aponta pro VPS.

## C. Primeiro acesso e hardening

```bash
ssh root@SEU_IP

# usuário de deploy (não usar root pro app)
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # copia sua chave SSH
# saia e reentre como deploy:
exit
ssh deploy@SEU_IP

# firewall: só SSH + HTTP + HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## D. Instalar dependências no VPS

```bash
# Docker (para Postgres + Redis)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy && newgrp docker

# Node LTS via nvm + pnpm + PM2
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
corepack enable
npm install -g pm2

# Nginx + Certbot
sudo apt update && sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

## E. Clonar o projeto e configurar o `.env`

```bash
cd ~
git clone SEU_REPO_GIT role-hoje
cd role-hoje

cp .env.production.example .env
nano .env   # preencha tudo (veja a seção G)

# gere os segredos:
openssl rand -hex 48   # -> JWT_SECRET
openssl rand -hex 32   # -> AVATAR_ENCRYPTION_SECRET
# defina POSTGRES_PASSWORD e REDIS_PASSWORD fortes e reflita no DATABASE_URL
```

## F. Subir banco, migrations e o app

```bash
# Postgres + Redis (portas só em 127.0.0.1)
docker compose -f docker-compose.prod.yml --env-file .env up -d

# dependências + build + migrations
pnpm install --frozen-lockfile
pnpm build
pnpm exec prisma migrate deploy
# NÃO rode `prisma db seed` em produção (cria admin com senha pública + dados demo)

# subir com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # rode o comando que ele imprimir (mantém o app vivo após reboot)

pm2 logs role-hoje-api   # conferir que subiu sem erro
```

### Criar seu admin (sem seed)

Cadastre-se normalmente pelo app e depois promova a conta a ADMIN direto no banco:

```bash
docker exec -it role-hoje-postgres psql -U rolehoje -d role_hoje

UPDATE users.users
SET role = 'ADMIN', email_verified_at = now()
WHERE email = 'seu-email@dominio.com';
```

## G. Variáveis do `.env` (produção)

Já detalhado em `.env.production.example`. Os pontos que **se repetem** e precisam bater:

- Origem do front → `FRONTEND_URL` + *JS origins* (Google) + *referrer* (Maps)
- Domínio da API → `GOOGLE_CALLBACK_URL` + *redirect URI* (Google) + `VITE_BACKEND_URL` (front)

### Integrações
- **Resend**: verifique um domínio no painel (registros SPF/DKIM no DNS). `RESEND_FROM_EMAIL` tem que ser desse domínio. **Revogue a key antiga que estava no `.env.example`.**
- **Google OAuth**: redirect URI = `https://api.rolehoje.com/sessions/google/callback`; JS origin = `https://rolehoje.com`; **publique** a tela de consentimento.
- **Google Maps** (frontend): habilite Maps JS + Places + Geocoding, ative billing, restrinja a key por referrer.

## H. Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/api.rolehoje.com
sudo nano /etc/nginx/sites-available/api.rolehoje.com   # ajuste server_name e a porta
sudo ln -s /etc/nginx/sites-available/api.rolehoje.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS automático (adiciona o bloco 443 e renova sozinho)
sudo certbot --nginx -d api.rolehoje.com
```

Teste: `curl https://api.rolehoje.com/docs` deve dar 404 em produção (Swagger desligado) — sinal de que a API respondeu por HTTPS.

## I. Frontend

Build com o `.env` de produção e sirva o `dist`:
- **Vercel/Netlify/Cloudflare Pages** (recomendado): conecte o repo, defina `VITE_BACKEND_URL` e `VITE_GOOGLE_MAPS_API_KEY` nas env vars do painel, build command `pnpm build`, output `dist`.
- **No mesmo VPS**: `pnpm build` e aponte um `server` Nginx pro diretório `dist` (com `try_files $uri /index.html;` para o SPA).

## J. Deploys seguintes

```bash
cd ~/role-hoje
bash deploy.prod.sh   # git pull + install + build + migrate + pm2 reload (sem seed)
```

## K. Backups (não esqueça)

```bash
# dump diário do Postgres
docker exec role-hoje-postgres pg_dump -U rolehoje role_hoje | gzip > ~/backups/db-$(date +%F).sql.gz
```
Agende no `crontab -e` e faça backup também do diretório `storage/` (avatares). Coloque num storage externo (ex.: bucket S3/R2).

---

### Checklist final antes de divulgar
- [ ] Key da Resend antiga **revogada**; nova key + domínio verificado
- [ ] `JWT_SECRET` e `AVATAR_ENCRYPTION_SECRET` novos e únicos
- [ ] Postgres/Redis **não** acessíveis pela internet (só 127.0.0.1) + senhas fortes
- [ ] `prisma db seed` **não** roda em produção; admin criado manualmente
- [ ] OAuth publicado e redirect URIs corretos
- [ ] Maps key restrita por referrer + billing ativo
- [ ] HTTPS funcionando (Certbot) e `NODE_ENV=production`
- [ ] Backup do banco + `storage/` agendado
