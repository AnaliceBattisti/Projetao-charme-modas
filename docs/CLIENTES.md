# API de clientes

O módulo usa os campos do diagrama da equipe e acrescenta e-mail e múltiplos endereços de entrega, previstos na seção 6.5 do documento de escopo. O cadastro é utilizado pelas compras e pelo crediário do painel administrativo.

## Preparação

Com o PostgreSQL em execução e `backend/.env` configurado a partir de `.env.example`, execute na pasta `backend`:

```sh
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

A migração `20260907143000_clientes_email_enderecos` adiciona `Cliente.email` (opcional) e a tabela `EnderecoCliente`. Os clientes existentes continuam válidos, com e-mail nulo e lista de endereços vazia. A URL padrão da API é `http://localhost:3333`.

## Endpoints

| Método | Caminho | Resultado |
| --- | --- | --- |
| GET | `/clientes` | Lista ordenada por nome e ID, com endereços e crediário. |
| GET | `/clientes?busca=maria` | Busca por parte do nome, sem diferenciar maiúsculas, ou por CPF. |
| GET | `/clientes/:id` | Cadastro, endereços, crediário e histórico de compras. |
| POST | `/clientes` | Cria cliente e, opcionalmente, seus endereços em uma única operação. |
| PUT | `/clientes/:id` | Atualiza os campos enviados do cadastro. |
| DELETE | `/clientes/:id` | Exclui cliente sem compras ou crediário vinculados. |
| GET | `/clientes/:id/compras` | Histórico de compras, da mais recente à mais antiga. |
| GET | `/clientes/:id/enderecos` | Lista os endereços do cliente. |
| POST | `/clientes/:id/enderecos` | Adiciona um endereço ao cliente. |
| PUT | `/clientes/:id/enderecos/:enderecoId` | Atualiza os campos enviados de um endereço do cliente. |
| DELETE | `/clientes/:id/enderecos/:enderecoId` | Exclui um endereço do cliente. |

Envie `Content-Type: application/json` nas requisições com corpo. As listagens retornam arrays, incluindo `[]` quando vazias. Um cliente inexistente retorna `404`, inclusive nas consultas de histórico e endereços.

## Cadastro

Exemplo de corpo para `POST /clientes` (dados fictícios para desenvolvimento):

```json
{
  "nome": "Maria de Teste",
  "cpf": "529.982.247-25",
  "idade": 30,
  "profissao": "Professora",
  "estadoCivil": "Solteira",
  "telefone": "+55 (87) 99999-0000",
  "email": "maria@example.com",
  "enderecos": [
    {
      "cep": "55290-000",
      "logradouro": "Rua de Teste",
      "numero": "100",
      "complemento": "Apto 2",
      "bairro": "Centro",
      "cidade": "Garanhuns",
      "estado": "PE"
    }
  ]
}
```

Retorna `201`, o cliente criado (incluindo `id`, `crediario` e `enderecos`) e o cabeçalho `Location: /clientes/:id`. O crediário é `null` até ser criado pelo módulo responsável.

| Campo | Regra |
| --- | --- |
| `nome` | Obrigatório; texto não vazio, até 150 caracteres. |
| `cpf` | Obrigatório; string de 11 dígitos ou com máscara. Valida dígitos verificadores e rejeita sequências repetidas. Salvo sem máscara e único. |
| `idade` | Opcional; número inteiro entre 0 e 130 ou `null`. |
| `profissao`, `estadoCivil` | Opcionais; texto livre de até 150 caracteres ou `null`. |
| `telefone` | Opcional; telefone brasileiro com DDD, 10 ou 11 dígitos, aceitando máscara e prefixo `+55`. Salvo somente com DDD e número. |
| `email` | Opcional; formato de e-mail, até 254 caracteres. Salvo em minúsculas. Não é um identificador único. |
| `enderecos` | Opcional no POST; lista de até 20 endereços na criação. |

Espaços nas extremidades dos textos são removidos. Campos opcionais de texto podem ser limpos com `null` ou `""`. Campos desconhecidos, IDs no corpo e operações diretas sobre compras ou crediário são rejeitados.

O `PUT` preserva os campos omitidos. Por exemplo, `PUT /clientes/1` com o corpo abaixo altera somente telefone e e-mail:

```json
{
  "telefone": "(87) 98888-0000",
  "email": null
}
```

Endereços são editados pelas rotas próprias; `enderecos` não é aceito no `PUT /clientes/:id`. Um endereço inválido no cadastro inicial impede a criação de todo o cadastro.

## Endereços

`POST /clientes/:id/enderecos` recebe um objeto com a mesma estrutura de um endereço do exemplo. São obrigatórios `cep`, `logradouro`, `numero`, `bairro`, `cidade` e `estado`. `complemento` é opcional.

O CEP aceita 8 dígitos ou a máscara `00000-000` e é salvo sem máscara. O estado deve ser uma UF brasileira válida e é salvo em maiúsculas. O número é texto de até 20 caracteres, permitindo `"s/n"`; os demais textos aceitam até 150 caracteres. A validação de CEP e e-mail verifica o formato, sem consultar serviços externos.

`PUT /clientes/1/enderecos/2` aceita alterações parciais, por exemplo:

```json
{
  "numero": "120",
  "complemento": null
}
```

Um endereço só pode ser atualizado ou excluído quando pertence ao cliente informado na URL. Não é possível transferir endereços alterando `clienteId` no corpo.

## Histórico e exclusão

As compras incluem itens com variação e produto, além das parcelas ordenadas por número. Os valores monetários do Prisma são serializados como strings decimais e as datas no formato ISO 8601.

Clientes com qualquer compra (inclusive cancelada) ou crediário vinculado não podem ser excluídos: a API retorna `409` e preserva os registros. Quando a exclusão é permitida, os endereços do cliente são removidos junto com o cadastro. As restrições do banco também protegem contra vínculos criados simultaneamente à exclusão.

## Respostas de erro

Os erros seguem o formato consumido pelo frontend:

```json
{
  "error": "Já existe um cliente cadastrado com este CPF."
}
```

| Status | Situação |
| --- | --- |
| `400` | Dados inválidos, ID inválido, corpo vazio, campos não permitidos ou JSON malformado. |
| `404` | Cliente/endereço não encontrado ou endereço que não pertence ao cliente da URL. |
| `409` | CPF duplicado ou exclusão impedida por compras/crediário. |
| `413` | Corpo maior que o limite do parser JSON (100 KB). |
| `500` | Erro interno, sem detalhes do banco na resposta. |

Operações de criação retornam `201`, consultas e atualizações retornam `200`, e exclusões retornam `204` sem corpo.

## Testes

Os testes usam o testador nativo do Node.js e foram executados com Node.js 22.19.0 e PostgreSQL 15.14.

Validações, sem precisar de banco:

```sh
npm test
```

Integração HTTP com PostgreSQL, no PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://charme:charme@localhost:5432/charme_modas'
npm run test:integration
```

O usuário do banco precisa poder criar schemas. Cada execução cria um schema exclusivo `clientes_test_<uuid>`, aplica as migrações nele e o remove ao terminar. A suíte exige `TEST_DATABASE_URL` explicitamente e não usa `DATABASE_URL` como alternativa. Nenhum dado é gravado nas tabelas do schema normal da aplicação.

Há cobertura para CRUD, normalização e unicidade de CPF (inclusive requisições simultâneas), cadastro com endereços, edição parcial, isolamento de endereços, histórico detalhado, proteção da exclusão e respostas de erro.
