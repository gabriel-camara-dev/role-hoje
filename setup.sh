#!/bin/bash

# Pega o nome da pasta atual
CURRENT_FOLDER=$(basename "$(pwd)")

# Gera uma chave JWT aleatória de 64 caracteres hexadecimais
JWT_SECRET=$(openssl rand -hex 32)

echo "Removendo .env antigo e criando um novo a partir do .env.example..."

# Remove o .env se existir
rm -f .env

# Copia o exemplo
cp .env.example .env

# Substitui o valor de APP_NAME e JWT_SECRET
sed -i "s/^APP_NAME=.*/APP_NAME=$CURRENT_FOLDER/" .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/^PROJECT_NAME=.*/PROJECT_NAME=$CURRENT_FOLDER/" .env

echo "APP_NAME definido como: $CURRENT_FOLDER"
echo "JWT_SECRET gerado automaticamente."