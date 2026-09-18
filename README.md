# Charme Modas — Gestão e loja virtual

Projeto acadêmico para a loja Charme Modas (Garanhuns-PE): controle de estoque/backoffice e crediário via painel administrativo. E-commerce público e pagamento online ficam para depois, se sobrar tempo.

## 🔗 Acesso

- **Loja Virtual**: [https://projetao-grupo01.ufape.edu.br](https://projetao-grupo01.ufape.edu.br)
- **Painel Admin**: [https://projetao-grupo01.ufape.edu.br/admin](https://projetao-grupo01.ufape.edu.br/admin)

## Stack

- **Backend**: Node.js + Express + Prisma
- **Banco de dados**: PostgreSQL (via Docker Compose)
- **Frontend (painel admin)**: React + Vite
- **Frontend (loja virtual)**: React + Vite + React Router, CSS próprio

## Estrutura

```text
backend/             API Express + schema Prisma (traduzido do diagrama ER da equipe)
frontend-admin/      Painel administrativo em React (Login, Dashboard, Produtos, Estoque,
                     Fornecedores, Clientes, Crediário, Compras)
frontend-loja/       E-commerce: catálogo integrado, produto, carrinho, favoritos,
                     login, cadastro, conta e edição de dados e endereços
docs/                Escopo, arquitetura e documentação dos módulos
docker-compose.yml   Postgres local
```

## Como rodar

1. Subir o banco:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```
   API sobe em `http://localhost:3333` (`GET /health` para checar).

3. Painel admin:
   ```bash
   cd frontend-admin
   npm install
   npm run dev
   ```
   Abre em `http://localhost:5173`.

4. Loja virtual (em outro terminal; cadastro e login precisam do backend e do banco):
   ```bash
   cd frontend-loja
   npm ci
   npm run dev
   ```
   Abre em `http://localhost:5174`.

   Para verificar a loja:
   ```bash
   npm run build
   ```

   Acesse `/cadastro` para criar uma conta e `/conta` para entrar. Em **Minha conta → Editar meus dados**, atualize dados pessoais e endereços. O cadastro grava `Usuario` com senha protegida por hash e vincula os dados ao `Cliente`, que aparece no painel. O catálogo consulta a API; sacola e favoritos ficam no navegador.

## Documentação

- [docs/ESCOPO.md](./docs/ESCOPO.md) — o que está dentro/fora do escopo e por quê, divisão da equipe, status de cada tela
- [docs/ARQUITETURA.md](./docs/ARQUITETURA.md) — como backend e frontend são organizados, decisões técnicas
- [docs/RECUPERACAO_SENHA.md](./docs/RECUPERACAO_SENHA.md) — esqueci minha senha, configuração SMTP e caixa de teste local
- [docs/BANCO_DE_DADOS.md](./docs/BANCO_DE_DADOS.md) — modelo de dados, relações, o que mudou em relação ao diagrama ER original