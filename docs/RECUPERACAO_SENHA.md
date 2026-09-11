# Recuperação de senha da loja

O link **Esqueci minha senha** na tela de login abre `/esqueci-senha`. O cliente informa o e-mail de acesso, recebe um link e define a nova senha em `/redefinir-senha`. As páginas reutilizam os componentes e estilos de conta.

## Executar localmente

Use Node.js 20 ou mais recente, conforme a dependência SMTP. A implementação foi validada com Node.js 24.

Na raiz, inicie a caixa de teste:

```sh
docker compose -f docker-compose.mail.yml up -d
```

No `backend/.env`, acrescente estas variáveis sem sobrescrever as existentes:

```dotenv
LOJA_URL=http://localhost:5174
EMAIL_FROM=contato@charme-modas.test
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

Na pasta `backend`, instale as dependências, aplique a migração e reinicie a API:

```sh
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev
```

No Windows, pare a API e o Prisma Studio antes de gerar o Prisma Client, caso o arquivo da engine esteja em uso. A migração acrescenta somente a tabela `RecuperacaoSenha`, seus índices e sua chave estrangeira; não apaga registros existentes. Não é necessário executar o seed.

Com a loja em execução, abra `http://localhost:5174/login`, clique em **Esqueci minha senha** e informe o e-mail de uma conta criada pela loja. Leia a mensagem em **http://localhost:8025**, abra o link e salve a nova senha. Depois entre novamente. O Mailpit guarda as mensagens localmente e não as entrega a caixas reais, mesmo se o endereço informado for Gmail ou outro provedor.

## SMTP real

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS` conforme o serviço contratado e use um remetente autorizado em `EMAIL_FROM`. Não coloque credenciais no frontend nem em arquivos versionados. `LOJA_URL` deve ser a origem HTTPS pública da loja, sem caminho, parâmetros ou credenciais, e essa origem também deve constar em `LOJA_ORIGENS`.

Na porta 465, use `SMTP_SECURE=true`; na porta 587, use `SMTP_SECURE=false`, com STARTTLS obrigatório. Somente SMTP de loopback em desenvolvimento permite comunicação sem TLS. A verificação de certificados permanece habilitada. Sem configuração válida, a solicitação responde `503` para qualquer e-mail.

## Regras

- Usa `Usuario.email`, o e-mail de acesso, e somente contas `CLIENTE` vinculadas a um cliente. Não recupera usuários internos pelo fluxo público.
- A solicitação responde `202` com a mesma mensagem para contas existentes e inexistentes. A consulta e o envio são assíncronos, sem aguardar SMTP na resposta HTTP.
- O token tem 32 bytes aleatórios. Apenas seu SHA-256 é armazenado, em uma relação única com o usuário; o token original não aparece nas respostas da API nem nos logs.
- O link vale por 30 minutos, só funciona uma vez e fica inválido após um novo envio. Há um intervalo mínimo de cinco minutos entre envios por conta e limite de 30 requisições por IP a cada 15 minutos, independente do login.
- A senha segue a validação já usada no cadastro: 8 a 128 caracteres, não pode conter somente espaços e precisa ser confirmada. O hash continua sendo scrypt com salt aleatório.
- O consumo do token, a alteração de `Usuario.senhaHash` e a remoção das sessões acontecem na mesma transação, com bloqueio por usuário. Duas tentativas simultâneas não conseguem usar o mesmo link.
- Nome, e-mails, CPF, endereços, papel, cliente, compras e crediário são preservados. O usuário deve entrar normalmente após a troca; não há login automático.
- O e-mail de confirmação da troca não contém a senha. Falha nesse aviso não desfaz uma troca concluída.
- O token é enviado no fragmento do link (`#token=...`), que não segue para o servidor da loja ou no Referer. A página remove o fragmento do histórico e mantém o token somente em memória. Se recarregar a página antes de salvar, reabra o link do e-mail.

O processamento SMTP é limitado a 20 tarefas simultâneas em memória. Uma reinicialização durante o envio pode interromper a entrega; nesse caso, solicite outro link após cinco minutos. Falha SMTP conhecida elimina o token criado e registra uma mensagem técnica sem dados pessoais. Não há fila persistente ou reenvio automático.

## API e testes

| Método | Rota | Corpo |
| --- | --- | --- |
| POST | `/auth/esqueci-senha` | `{ "email": "cliente@example.com" }` |
| POST | `/auth/redefinir-senha` | `{ "token": "...", "senha": "...", "confirmacao": "..." }` |

As rotas herdam os controles de origem, JSON, tamanho de corpo, cache e tratamento de erros de `/auth`. Campos adicionais são rejeitados. Link inválido, expirado ou utilizado responde `400`; limite de tentativas responde `429` com `Retry-After`.

`npm run test:integration` inclui `test/recuperacaoSenha.integration.test.js`. A suíte exige `TEST_DATABASE_URL`, usa um schema temporário removido ao final e um servidor SMTP de teste em loopback. Não envia e-mails reais. Cobre envio, expiração, uso único, concorrência, preservação do cliente, revogação de sessões, validações, falha SMTP e limites.

Referências: [recuperação de senha — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [SMTP — Nodemailer](https://nodemailer.com/smtp), [Docker — Mailpit](https://mailpit.axllent.org/docs/install/docker/).
