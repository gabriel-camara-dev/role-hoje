#!/bin/bash

source ~/.bashrc

git pull origin main

corepack enable
pnpm install --frozen-lockfile

pnpm build

pnpm exec prisma migrate deploy

pnpm exec prisma db seed

env ASDF_NODEJS_VERSION=$NODE_VERSION_PM2 pm2 reload ecosystem.config.js

env ASDF_NODEJS_VERSION=$NODE_VERSION_PM2 pm2 reload ecosystem-dev.config.js