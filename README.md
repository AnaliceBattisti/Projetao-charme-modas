# Charme Modas — Sistema de gestão

Projeto acadêmico para a loja Charme Modas (Garanhuns-PE): controle de estoque/backoffice e crediário via painel administrativo. E-commerce público e pagamento online ficam para depois, se sobrar tempo.

## Stack

- **Backend**: Node.js + Express + Prisma
- **Banco de dados**: PostgreSQL (via Docker Compose)
- **Frontend (painel admin)**: React + Vite

## Estrutura

```
backend/          API Express + schema Prisma (traduzido do diagrama ER da equipe)
frontend-admin/   Painel administrativo em React (Login, Dashboard, Produtos, Estoque,
                   Fornecedores, Clientes, Crediário, Compras)
docker-compose.yml   Postgres local
```

## Como rodar

1. Subir o banco:
   ```
   docker compose up -d
   ```
2. Backend:
   ```
   cd backend
   npm install
   cp .env.example .env
   npx prisma generate
   npx prisma migrate dev --name init
   npm run dev
   ```
   API sobe em `http://localhost:3333` (`GET /health` para checar).
3. Painel admin:
   ```
   cd frontend-admin
   npm install
   npm run dev
   ```
   Abre em `http://localhost:5173`.

