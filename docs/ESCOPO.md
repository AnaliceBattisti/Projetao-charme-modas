# Escopo do projeto

Projeto acadêmico em grupo (Analice, Nicoly, Juan e Richard) pra sistematizar a gestão da **Charme Modas**, loja de vestuário (feminino, masculino, infantil e acessórios) com loja física em Garanhuns-PE.

## Escopo original vs. escopo atual

O escopo inicial (definido em documento compartilhado pela equipe) cobria tanto o backoffice da loja quanto uma vitrine de e-commerce com pagamento online. Na conversa de definição do grupo, a equipe decidiu **reduzir o escopo** por causa do prazo do projeto acadêmico:

> "Já que o foco é uma loja real, a gente pode focar no controle de estoque/backoffice e o crediário. Deixa o e-commerce e pagamento online pra caso de tempo." — decisão do grupo

Motivo: a parte de pagamento (integração tipo Stripe, ligar checkout ao estoque) foi identificada como a mais arriscada e trabalhosa dado o prazo, então o grupo optou por garantir primeiro um backoffice funcional (CRUD completo) e deixar loja pública/pagamento como extensão, só se sobrar tempo.

### Em escopo agora

- Cadastro e gestão de **fornecedores**
- Cadastro de **produtos** e suas **variações** (cor, tamanho, SKU)
- Controle de **estoque**: entradas, saídas, ajustes manuais, alerta de estoque baixo/esgotado
- Cadastro de **clientes**
- **Crediário**: limite de crédito, status (ativo/bloqueado), parcelas
- Registro de **compras/vendas** feitas na loja física (não é checkout de e-commerce — é o funcionário registrando uma venda já feita no balcão)
- Painel administrativo com login, dashboard com indicadores
- Estrutura das páginas do e-commerce, responsividade, busca/filtros, sacola e favoritos locais

### Fora de escopo por enquanto (fica pra depois, se sobrar tempo)

- Checkout público com pedidos reais e acompanhamento de pedidos pela conta
- Recuperação de senha, verificação de e-mail e autenticação real do painel administrativo
- Integração de pagamento online (ex.: Stripe)

## Divisão de responsabilidades proposta pelo grupo

A equipe dividiu o trabalho em quatro frentes (a numeração é só organizacional, não é obrigatoriamente uma pessoa fixa por frente):

1. **Back-end e banco de dados** — produtos, estoque, fornecedores, clientes, crediário
2. **Front-end do site de vendas** — catálogo integrado, carrinho e contas implementados; checkout pendente
3. **Pagamento e integrações** *(em espera, mesma razão)*
4. **Painel administrativo e crediário** — telas do backoffice, gestão de pagamentos do crediário, bloqueio de cliente inadimplente

A priorização inicial concentrou o esforço nas frentes 1 e 4. A estrutura da frente 2 foi retomada em 08/09/2026; pagamentos permanecem para uma etapa posterior.

## Telas do painel administrativo

Definidas junto com a identidade visual da marca (paleta lilás/vinho, baseada no logo e na vitrine da loja no Instagram):

| Tela | Conteúdo |
|---|---|
| **Login** | Acesso ao painel |
| **Dashboard** | Indicadores: total em estoque, vendas do mês, a receber no crediário, produtos com estoque baixo |
| **Produtos** | Lista com filtro por categoria e busca; cadastro de produto e suas variações (cor/tamanho/SKU) |
| **Estoque** | Situação de cada variação (adequado/estoque baixo/esgotado), registrar entrada, ajuste manual, histórico de movimentações |
| **Fornecedores** | Cadastro (nome/razão social, CNPJ, localização, categoria) e produtos vinculados |
| **Clientes** | Cadastro (nome, CPF, idade, profissão, estado civil, telefone) e histórico de compras |
| **Crediário** | Clientes com crediário ativo, limite, valor em aberto, status; parcelas e ação de marcar como paga |
| **Compras / Vendas** | Registrar uma venda: cliente, itens (produto → variação → quantidade → preço), forma de pagamento; se for crediário, gera as parcelas |

## Status de implementação

**Loja virtual:** início, catálogo integrado, produto, carrinho, favoritos, menu, contato e contas. Cadastro cria usuário com senha protegida e cliente vinculado; login mantém uma sessão validada no backend. A conta permite editar dados pessoais e endereços. Checkout e acompanhamento de pedidos pela conta continuam pendentes.

Ver o `README.md` na raiz do repositório pra instruções de como rodar o projeto. Resumo do que já está funcional vs. pendente:

**Funcional (front conectado ao back):**
- Cadastro e login de clientes da loja, sessão e logout
- Login do painel 
- Produtos (CRUD + variações)
- Fornecedores (CRUD)
- Estoque (situação + movimentações)

**Backend pronto, front ainda é placeholder:**
- Clientes
- Crediário

Mais detalhes técnicos em [ARQUITETURA.md](./ARQUITETURA.md) e [BANCO_DE_DADOS.md](./BANCO_DE_DADOS.md).
