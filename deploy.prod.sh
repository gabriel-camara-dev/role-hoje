#!/bin/bash
# Deploy de produção (rodar no VPS, dentro do diretório do projeto).
# NÃO roda `prisma db seed` (o seed cria um admin com senha pública + dados demo).
set -euo pipefail

echo "==> Atualizando código"
git pull origin main

echo "==> Instalando dependências"
corepack enable
pnpm install --frozen-lockfile

echo "==> Build"
pnpm build

echo "==> Migrations"
pnpm exec prisma migrate deploy

echo "==> Reload PM2"
pm2 reload ecosystem.config.js --update-env

echo "==> OK. Status:"
pm2 status
