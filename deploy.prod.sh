#!/usr/bin/env bash
#
# Deploy/atualização de produção do backend (rodar no VPS).
# Uso:  bash deploy.prod.sh
#
# O app roda via `tsx` (sem build). O script NÃO roda `prisma db seed`
# (o seed cria um admin com senha pública + dados demo).

set -euo pipefail

APP_NAME="role-hoje-api"
ENTRY="src/main.ts"

# Sempre executa a partir da pasta do projeto (onde está este script).
cd "$(dirname "$0")"

echo "==> [1/5] Atualizando código (git pull)"
git pull --ff-only

echo "==> [2/5] Instalando dependências (inclui dev: prisma/tsx são necessários)"
corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile --prod=false

echo "==> [3/5] Gerando Prisma Client"
pnpm exec prisma generate

echo "==> [4/5] Aplicando migrations (seguro: não roda seed)"
pnpm exec prisma migrate deploy

echo "==> [5/5] (Re)iniciando o PM2 (${APP_NAME})"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start "${ENTRY}" --interpreter ./node_modules/.bin/tsx --name "${APP_NAME}"
fi
pm2 save

echo ""
echo "==> OK. Status atual:"
pm2 status
echo ""
echo "==> Últimos logs (Ctrl+C para sair):"
pm2 logs "${APP_NAME}" --lines 20 --nostream
