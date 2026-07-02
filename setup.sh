#!/bin/bash

# Pega o nome da pasta atual
CURRENT_FOLDER=$(basename "$(pwd)")

# Gera uma chave JWT aleatoria de 64 caracteres hexadecimais
JWT_SECRET=$(openssl rand -hex 32)

echo "Preparando .env a partir da .env.example..."

if [ ! -f .env ]; then
  cp .env.example .env
else
  echo ".env ja existe; mantendo valores atuais e atualizando apenas os campos basicos."
fi

# Substitui o valor de APP_NAME e JWT_SECRET sem apagar outras configuracoes manuais.
sed -i "s/^APP_NAME=.*/APP_NAME=$CURRENT_FOLDER/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/^PROJECT_NAME=.*/PROJECT_NAME=$CURRENT_FOLDER/" .env

echo "APP_NAME definido como: $CURRENT_FOLDER"
echo "JWT_SECRET gerado automaticamente."