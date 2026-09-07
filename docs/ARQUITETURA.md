# Arquitetura

## Visão geral

O projeto é dividido em duas aplicações independentes que conversam por HTTP, mais um banco de dados compartilhado:

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐        ┌────────────┐
│  frontend-admin      │  ──────────────────────▶ │  backend              │ ─────▶ │ PostgreSQL │
│  React + Vite         │ ◀────────────────────── │  Node.js + Express    │ ◀───── │ (Docker)   │
│  localhost:5173       │                          │  + Prisma ORM         │        │ :5432      │
│                        │                          │  localhost:3333       │        │            │
└─────────────────────┘                          └──────────────────────┘        └────────────┘
```

Não existe camada de e-commerce público nem integração de pagamento — o escopo atual é só o **painel administrativo** (backoffice). Veja [ESCOPO.md](./ESCOPO.md) para o porquê dessa decisão.

## Backend (`backend/`)

- **Node.js + Express**, JavaScript puro (sem TypeScript), módulos ES (`"type": "module"` no `package.json`).
- **Prisma** como ORM sobre PostgreSQL — o schema (`prisma/schema.prisma`) é a fonte da verdade do modelo de dados (ver [BANCO_DE_DADOS.md](./BANCO_DE_DADOS.md)).
- Sem autenticação de verdade na API ainda: as rotas não checam token/sessão. A trava de login que existe hoje é só no front (ver abaixo). Isso é uma lacuna conhecida, não um esquecimento — falta decidir e implementar JWT/sessão antes de expor isso fora da rede local.

Estrutura:

```
backend/
├── prisma/
│   ├── schema.prisma        Modelo de dados
│   └── migrations/          Histórico de migrations (gerado pelo Prisma)
└── src/
    ├── server.js            Sobe o Express na porta do .env (padrão 3333)
    ├── app.js                Instancia o Express, cors, json, monta as rotas
    ├── lib/prisma.js         Client Prisma compartilhado (uma instância só)
    ├── validation/clientes.js Validação e normalização de clientes, endereços e IDs
    └── routes/
        ├── fornecedores.js   CRUD completo
        ├── produtos.js       CRUD + variações (cor/tamanho/SKU) + travas de exclusão
        ├── estoque.js        Situação do estoque + registrar entrada/ajuste
        ├── clientes.js       Cadastro, endereços, histórico e débitos; abertura de crediário
        ├── crediario.js      CRUD básico (sem tela no front ainda)
        └── compras.js        Criação de compra + itens (falta baixa de estoque e geração de parcelas — ver TODO no arquivo)
```

Cada rota segue o mesmo padrão: recebe a requisição, valida o mínimo necessário, chama o Prisma Client e devolve JSON. Não há camada de "service" ou "controller" separada — para o tamanho atual do projeto, rota fina direto no Prisma é suficiente.

### Regras de negócio já implementadas no backend

- **Baixa/entrada de estoque**: `POST /estoque/movimentacoes` cria o registro de `MovimentacaoEstoque` e atualiza `Variacao.estoqueAtual` **na mesma transação** (`prisma.$transaction`), pra nunca ficar dessincronizado.
- **Exclusão segura**: não dá pra excluir um `Produto` que ainda tem variações, nem uma `Variacao` que tenha estoque > 0 ou histórico de movimentação/venda. Ver `DELETE /produtos/:id` e `DELETE /produtos/:id/variacoes/:variacaoId`.
- **Compra**: `POST /compras` cria a compra e os itens numa transação, mas **ainda não** dá baixa automática no estoque nem gera parcelas de crediário — isso está marcado como TODO no próprio arquivo de rota, é o próximo passo de quem for mexer em Compras/Crediário.

### Módulo de clientes

As rotas ficam em `src/routes/clientes.js`, montadas em `/clientes` pelo `app.js`. O módulo usa o Prisma Client compartilhado e concentra a validação de cadastro, endereços e IDs em `src/validation/clientes.js`. A tela `frontend-admin/src/pages/Clientes.jsx` ainda é um placeholder visual, sem chamadas à API.

- **Cadastro integrado**: `POST /clientes` valida nome, CPF e os campos opcionais (idade, profissão, estado civil, telefone e e-mail), e aceita uma lista opcional de endereços de entrega. Cliente, endereços e crediário são criados na mesma operação atômica do Prisma; uma falha impede a gravação do conjunto. O crediário nasce `ATIVO`, com `limiteCredito` e `limiteDisponivel` definidos por `EXPOSICAO_CREDITO_CREDIARIO` (zero quando ausente). A resposta `201` inclui o cadastro, os endereços e o crediário, além do cabeçalho `Location`.
- **Validação e unicidade**: o CPF tem os dígitos verificadores validados e é salvo sem máscara. A verificação de duplicidade também reconhece CPFs antigos com máscara; a restrição única do banco protege as gravações simultâneas do CPF normalizado. Telefone, e-mail, CEP e UF são normalizados. Campos desconhecidos e operações sobre compras ou crediário enviadas no corpo do cadastro são rejeitados.
- **Consulta e edição**: `GET /clientes` lista os cadastros com endereços e crediário; `?busca=` filtra por nome sem distinguir maiúsculas ou por CPF. `GET /clientes/:id` também inclui o histórico de compras. `PUT /clientes/:id` altera somente os campos enviados, permite limpar opcionais e preserva o crediário existente.
- **Endereços**: `GET` e `POST /clientes/:id/enderecos` consultam e adicionam endereços; `PUT` e `DELETE /clientes/:id/enderecos/:enderecoId` editam parcialmente e excluem. A atualização e a exclusão verificam o vínculo com o cliente da URL. Endereços existentes são alterados nessas rotas próprias, não no `PUT` do cadastro.
- **Histórico e débitos**: `GET /clientes/:id/compras` retorna compras com itens, variações, produtos e parcelas. `GET /clientes/:id/debitos?dias=30` calcula `totalPendente`, `totalAtraso`, `totalPago` e `qtdParcelasAtrasadas` a partir das parcelas com vencimento até o horizonte informado, incluindo as já vencidas. O padrão é 30 dias, inclusive quando `dias=0`; o cálculo de atraso não altera o status salvo das parcelas.
- **Exclusão protegida**: `DELETE /clientes/:id` retorna `409` se houver parcelas em aberto ou qualquer compra registrada, mesmo quitada. Sem compras, a API remove o crediário e o cliente na mesma transação, apaga os endereços em cascata e retorna `204`. Isso vale tanto para clientes novos com crediário automático quanto para cadastros antigos sem crediário.

As falhas de validação retornam `400`, registros inexistentes ou endereços de outro cliente retornam `404`, e CPF duplicado ou exclusão impedida retornam `409`. As rotas de cadastro usam `{ "error": "..." }`; a consulta de débitos mantém `{ "erro": "..." }` para cliente inexistente e falhas internas. A validação comum de IDs usa `{ "error": "..." }` também nessa consulta.

O módulo de clientes abre o crediário no cadastro e consulta os vínculos existentes. Bloqueio e alteração de limite ficam em `/crediarios`, criação de compras em `/compras` e baixa de parcelas em `/parcelas`. Editar um cliente não executa essas operações.

Os testes ficam em `backend/test/clientes.validation.test.js` e `backend/test/clientes.integration.test.js`. A integração usa HTTP e PostgreSQL, exige `TEST_DATABASE_URL`, aplica as migrations em um schema exclusivo `clientes_test_<uuid>` e remove esse schema ao terminar. Os cenários cobrem cadastro com crediário e endereços, CPF duplicado, edição parcial, proteção dos vínculos e integração com compras, limites, bloqueio e pagamento de parcelas. Os contratos completos e os comandos de execução estão em [CLIENTES.md](./CLIENTES.md).

## Frontend admin (`frontend-admin/`)

- **React 18 + Vite**, JavaScript puro, `react-router-dom` para as rotas.
- Sem Redux/Context API de estado global — cada página busca seus próprios dados com `useEffect` + `fetch` (via `src/api.js`) e guarda no `useState` local. Suficiente pro tamanho atual; se o projeto crescer muito, vale revisitar.

Estrutura:

```
frontend-admin/
├── public/
│   ├── logo.png              Logo da marca (usado no login e na sidebar)
│   └── vitrine.jpg           Foto da loja (usada no login)
└── src/
    ├── main.jsx               Ponto de entrada, injeta theme.css
    ├── App.jsx                Definição das rotas (React Router)
    ├── theme.css              Todo o design system do painel (cores, componentes)
    ├── api.js                 Cliente fetch fino, aponta pro backend (localhost:3333)
    ├── auth.js                Sessão via localStorage (placeholder — ver abaixo)
    ├── format.js               Helpers de formatação (moeda)
    ├── icons.jsx               Ícones SVG inline usados na sidebar e botões
    ├── components/
    │   ├── Layout.jsx          Sidebar + área de conteúdo (usado por todas as páginas logadas)
    │   ├── Modal.jsx            Modal genérico reutilizável (usado nos formulários de cadastro)
    │   └── RequireAuth.jsx      Guard de rota — redireciona pro /login se não houver sessão
    └── pages/
        ├── Login.jsx            Tela de login (split: formulário + foto da loja)
        ├── Dashboard.jsx        Indicadores (ainda com dados placeholder "—")
        ├── Produtos.jsx         Funcional: lista, filtro por categoria, busca, cadastro (modal), variações
        ├── Fornecedores.jsx     Funcional: lista, busca, cadastro (modal) com máscara de CNPJ
        ├── Estoque.jsx           Funcional: situação (adequado/baixo/esgotado), registrar entrada/ajuste, histórico
        ├── Clientes.jsx          Placeholder (endpoints já existem no backend)
        ├── Crediario.jsx         Placeholder (endpoints já existem no backend)
        └── Compras.jsx           Placeholder (endpoint de criação já existe, mas incompleto — ver TODO acima)
```

### Autenticação (estado atual, importante)

Não existe login real ainda. `src/auth.js` só guarda uma flag (`cm_logged_in=1`) no `localStorage` do navegador — qualquer um que abra o DevTools e sete essa chave entra sem senha. Isso foi uma decisão consciente pra desbloquear a navegação entre as telas enquanto ninguém tinha implementado autenticação de verdade. Antes de qualquer deploy público, isso precisa virar login real (usuário/senha contra a tabela `Usuario`, com JWT ou sessão, validado no backend).

### Design system

Tudo fica em `theme.css`, usando CSS custom properties (`--cm-*`) como tokens: cores da marca (lilás/vinho, ver `--cm-accent`, `--cm-plum`), tipografia, espaçamento. Não usamos nenhuma biblioteca de UI (Tailwind, MUI etc.) — os componentes (`cm-card`, `cm-table`, `cm-badge`, `cm-button-pill`, `cm-modal-*`, `cm-filter-pill`...) são todos CSS próprio, pensados pra imitar o estilo de referência que a equipe validou (sidebar escura com ícones, cards claros, badges coloridos por status/categoria).

## Infraestrutura local

- **PostgreSQL** roda via Docker Compose (`docker-compose.yml` na raiz) — único serviço containerizado hoje. Backend e frontend rodam direto na máquina (`npm run dev`), não em container.
- Variáveis de ambiente do backend ficam em `backend/.env` (não versionado — `backend/.env.example` tem o template).

## Por que essas escolhas

- **React + Node** em vez de Spring: decisão da equipe por menor curva/esforço dado o prazo do projeto acadêmico (registrado na conversa do grupo).
- **PostgreSQL + Prisma**: modelo fortemente relacional (fornecedor → produto → variação → movimentação/venda, com FKs em cascata) se encaixa melhor num banco relacional do que NoSQL; Prisma reduz a distância entre o diagrama ER e o schema real, e já gera client tipado e migrations.
- **Sem TypeScript**: prioridade foi reduzir fricção de setup pro time, já que Prisma dá boa parte da segurança de tipos no acesso ao banco mesmo em JS puro.
