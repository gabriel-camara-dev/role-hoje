// PM2 — configuração de produção.
// O app carrega variáveis via dotenv/config (lê o .env do diretório do projeto),
// então basta o PM2 rodar o build. NODE_ENV=production desliga o Swagger.
module.exports = {
  apps: [
    {
      name: 'role-hoje-api',
      script: 'dist/main.js',
      node_args: '--enable-source-maps',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
