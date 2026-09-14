import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { before, after, test } from "node:test";
import { verificarSenha } from "../src/lib/senhas.js";

if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "Defina TEST_DATABASE_URL para executar os testes de integração.",
  );
const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol))
  throw new Error("TEST_DATABASE_URL deve apontar para PostgreSQL.");
const schema = `contas_test_${randomUUID().replaceAll("-", "")}`;
databaseUrl.searchParams.set("schema", schema);
process.env.DATABASE_URL = databaseUrl.toString();
process.env.EXPOSICAO_CREDITO_CREDIARIO = "150";
process.env.LOJA_ORIGENS = "http://localhost:5174";
const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
let server, baseUrl;
let sequencia = 300000000;
const endereco = {
  cep: "55290-000",
  logradouro: "Rua de Teste",
  numero: "10",
  bairro: "Centro",
  cidade: "Garanhuns",
  estado: "pe",
};

function novoCadastro(extra = {}) {
  let cpf = String(sequencia++);
  for (let length = 9; length <= 10; length++) {
    const resto =
      ([...cpf].reduce(
        (total, digito, indice) =>
          total + Number(digito) * (length + 1 - indice),
        0,
      ) *
        10) %
      11;
    cpf += resto === 10 ? "0" : String(resto);
  }
  return {
    nome: "Cliente Conta Teste",
    cpf,
    email: `conta-${randomUUID()}@example.com`,
    telefone: "87999990000",
    senha: "Senha de teste 123!",
    confirmacao: "Senha de teste 123!",
    ...extra,
  };
}

async function request(
  path,
  {
    method = "GET",
    body,
    cookie,
    origin,
    raw,
    contentType = "application/json",
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": contentType,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
    headers: response.headers,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const cadastrar = (body) => request("/auth/cadastro", { method: "POST", body });
const login = (body, cookie) =>
  request("/auth/login", {
    method: "POST",
    body: { email: body.email, senha: body.senha },
    cookie,
  });
const totais = async () =>
  Promise.all([
    prisma.usuario.count(),
    prisma.cliente.count(),
    prisma.crediario.count(),
    prisma.enderecoCliente.count(),
  ]);

before(async () => {
  execFileSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/prisma/build/index.js", import.meta.url),
      ),
      "migrate",
      "deploy",
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: process.env,
      stdio: "pipe",
      windowsHide: true,
    },
  );
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
});

test("cadastro cria Usuario CLIENTE e exclusão sem compras remove conta e dados vinculados", async () => {
  const dados = novoCadastro({
    email: ` CADASTRO-${randomUUID()}@EXAMPLE.COM `,
    enderecos: [endereco],
    idade: 30,
    profissao: "Professora",
  });
  const resposta = await cadastrar(dados);
  assert.equal(resposta.status, 201, JSON.stringify(resposta.data));
  const { usuario } = resposta.data;
  assert.equal(usuario.papel, "CLIENTE");
  assert.equal(usuario.clienteId, usuario.cliente.id);
  assert.equal(usuario.email, dados.email.trim().toLowerCase());
  assert.equal(usuario.cliente.cpf, dados.cpf);
  assert.equal(JSON.stringify(resposta.data).includes("senha"), false);
  const salvo = await prisma.usuario.findUnique({ where: { id: usuario.id } });
  assert.notEqual(salvo.senhaHash, dados.senha);
  assert.equal(await verificarSenha(dados.senha, salvo.senhaHash), true);
  const cliente = await prisma.cliente.findUnique({
    where: { id: usuario.clienteId },
    include: { enderecos: true, crediario: true, compras: true },
  });
  assert.equal(cliente.profissao, "Professora");
  assert.equal(cliente.enderecos[0].cep, "55290000");
  assert.equal(Number(cliente.crediario.limiteCredito), 150);
  assert.deepEqual(cliente.compras, []);
  const admin = await request(`/clientes/${cliente.id}`);
  assert.equal(admin.status, 200);
  assert.equal(JSON.stringify(admin.data).includes("senhaHash"), false);
  // Um cliente sem compras pode ser excluído mesmo possuindo conta de acesso.
  // Ao excluir o Usuario, SessaoUsuario e RecuperacaoSenha também usam Cascade.
  const sessao = await login(dados);
  assert.equal(sessao.status, 200, JSON.stringify(sessao.data));
  assert.equal(await prisma.sessaoUsuario.count({ where: { usuarioId: usuario.id } }), 1);

  await prisma.historicoLimiteCrediarioCliente.create({
    data: {
      clienteId: cliente.id,
      limiteAnterior: "150.00",
      limiteFinal: "200.00",
      motivo: "Teste de exclusão",
    },
  });

  const exclusao = await request(`/clientes/${cliente.id}`, { method: "DELETE" });
  assert.equal(exclusao.status, 204);
  assert.equal(await prisma.usuario.count({ where: { id: usuario.id } }), 0);
  assert.equal(await prisma.sessaoUsuario.count({ where: { usuarioId: usuario.id } }), 0);
  assert.equal(await prisma.cliente.count({ where: { id: cliente.id } }), 0);
  assert.equal(await prisma.crediario.count({ where: { clienteId: cliente.id } }), 0);
  assert.equal(await prisma.enderecoCliente.count({ where: { clienteId: cliente.id } }), 0);
  assert.equal(await prisma.historicoLimiteCrediarioCliente.count({ where: { clienteId: cliente.id } }), 0);
  assert.equal((await login(dados)).status, 401);
});

test("dados inválidos ou privilégios enviados não criam registros parciais", async () => {
  const antes = await totais();
  for (const extra of [
    { cpf: "00000000000" },
    { email: "invalido" },
    { confirmacao: "diferente" },
    { papel: "ADMIN" },
    { clienteId: 1 },
    { senhaHash: "hash" },
    { enderecos: [{ ...endereco, cep: "x" }] },
  ]) {
    const resultado = await cadastrar(novoCadastro(extra));
    assert.equal(resultado.status, 400);
  }
  assert.deepEqual(await totais(), antes);
});

test("recusa CPF existente, inclusive legado com máscara, sem tomar posse do cliente", async () => {
  const dados = novoCadastro();
  const cpf = dados.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const cliente = await prisma.cliente.create({
    data: { nome: "Cliente antigo", cpf },
  });
  const antes = await totais();
  assert.equal((await cadastrar(dados)).status, 409);
  assert.deepEqual(await totais(), antes);
  assert.equal(
    await prisma.usuario.count({ where: { clienteId: cliente.id } }),
    0,
  );
  assert.equal(
    (await prisma.cliente.findUnique({ where: { id: cliente.id } })).nome,
    "Cliente antigo",
  );
});

test("recusa email duplicado com maiúsculas e mantém atomicidade em cadastros simultâneos", async () => {
  const dados = novoCadastro();
  const concorrentes = await Promise.all([
    cadastrar(dados),
    cadastrar({ ...dados, email: dados.email.toUpperCase() }),
  ]);
  assert.deepEqual(concorrentes.map((r) => r.status).sort(), [201, 409]);
  const salvo = await prisma.usuario.findUnique({
    where: { email: dados.email },
  });
  assert.equal(await prisma.cliente.count({ where: { cpf: dados.cpf } }), 1);
  assert.equal(
    await prisma.crediario.count({ where: { clienteId: salvo.clienteId } }),
    1,
  );
  const antes = await totais();
  assert.equal(
    (await cadastrar(novoCadastro({ email: dados.email.toUpperCase() })))
      .status,
    409,
  );
  assert.deepEqual(await totais(), antes);
});

test("login usa cookie HttpOnly, restaura sessão, isola contas e revoga no logout", async () => {
  const dados = novoCadastro();
  const conta = await cadastrar(dados);
  const entrada = await login({ ...dados, email: dados.email.toUpperCase() });
  assert.equal(entrada.status, 200, JSON.stringify(entrada.data));
  assert.match(entrada.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(entrada.headers.get("set-cookie"), /SameSite=Lax/i);
  assert.equal(entrada.headers.get("cache-control"), "no-store");
  assert.equal(Object.hasOwn(entrada.data.usuario, "senhaHash"), false);
  const sessao = await prisma.sessaoUsuario.findFirst({
    where: { usuarioId: conta.data.usuario.id },
  });
  assert.equal(entrada.cookie.includes(sessao.tokenHash), false);
  const me = await request("/auth/me", { cookie: entrada.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.data.usuario.cliente.id, conta.data.usuario.clienteId);
  assert.equal((await request("/auth/me")).status, 401);
  assert.equal(
    (await request("/auth/me", { cookie: "cm_loja_sessao=invalido" })).status,
    401,
  );
  const outro = novoCadastro();
  const outraConta = await cadastrar(outro);
  const outraEntrada = await login(outro);
  assert.equal(
    (await request("/auth/me", { cookie: outraEntrada.cookie })).data.usuario
      .id,
    outraConta.data.usuario.id,
  );
  const saida = await request("/auth/logout", {
    method: "POST",
    body: {},
    cookie: entrada.cookie,
  });
  assert.equal(saida.status, 204);
  assert.equal(
    (await request("/auth/me", { cookie: entrada.cookie })).status,
    401,
  );
  assert.equal(
    (await request("/auth/me", { cookie: outraEntrada.cookie })).status,
    200,
  );
});

test("não autentica senha errada nem conta interna e expira e renova sessões", async () => {
  const dados = novoCadastro();
  const conta = await cadastrar(dados);
  for (const senha of ["Senha incorreta", "1", "1234567", "x".repeat(129)]) {
    const resposta = await login({ ...dados, senha });
    assert.equal(resposta.status, 401);
    assert.deepEqual(resposta.data, { error: "E-mail ou senha inválidos." });
    assert.equal(resposta.cookie, undefined);
  }
  for (const senha of ["", "   "]) {
    const resposta = await login({ ...dados, senha });
    assert.equal(resposta.status, 400);
    assert.deepEqual(resposta.data, { error: "Senha é obrigatória." });
  }
  assert.equal((await login(novoCadastro())).status, 401);
  const primeira = await login(dados);
  const segunda = await login(dados, primeira.cookie);
  assert.notEqual(primeira.cookie, segunda.cookie);
  assert.equal(
    (await request("/auth/me", { cookie: primeira.cookie })).status,
    401,
  );
  await prisma.sessaoUsuario.updateMany({
    where: { usuarioId: conta.data.usuario.id },
    data: { expiraEm: new Date(0) },
  });
  assert.equal(
    (await request("/auth/me", { cookie: segunda.cookie })).status,
    401,
  );
  await prisma.usuario.update({
    where: { id: conta.data.usuario.id },
    data: { papel: "ADMIN" },
  });
  assert.equal((await login(dados)).status, 401);
});

test("edita os próprios dados com as regras de clientes e preserva credenciais e vínculos comerciais", async () => {
  const dados = novoCadastro({
    idade: 29,
    profissao: "Professora",
    estadoCivil: "Solteiro(a)",
    enderecos: [endereco],
  });
  const conta = (await cadastrar(dados)).data.usuario;
  const { cookie } = await login(dados);
  const antes = await prisma.usuario.findUnique({ where: { id: conta.id } });
  const credito = await prisma.crediario.findUnique({
    where: { clienteId: conta.clienteId },
  });
  const cpf = novoCadastro().cpf;
  const atualizado = await request("/auth/me", {
    method: "PUT",
    cookie,
    body: {
      nome: "  Nome atualizado  ",
      cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
      telefone: "+55 (87) 98888-0000",
      idade: 30,
      profissao: "  Designer  ",
      estadoCivil: "Casado(a)",
    },
  });
  assert.equal(atualizado.status, 200, JSON.stringify(atualizado.data));
  assert.equal(atualizado.data.usuario.nome, "Nome atualizado");
  assert.equal(atualizado.data.usuario.email, dados.email);
  assert.equal(atualizado.data.usuario.cliente.email, dados.email);
  assert.equal(atualizado.data.usuario.cliente.cpf, cpf);
  assert.equal(atualizado.data.usuario.cliente.telefone, "87988880000");
  assert.equal(atualizado.data.usuario.cliente.profissao, "Designer");
  assert.equal(atualizado.data.usuario.cliente.enderecos.length, 1);
  assert.equal(JSON.stringify(atualizado.data).includes("senha"), false);
  const usuario = await prisma.usuario.findUnique({ where: { id: conta.id } });
  assert.equal(usuario.senhaHash, antes.senhaHash);
  assert.equal(usuario.clienteId, antes.clienteId);
  assert.equal(usuario.papel, "CLIENTE");
  assert.deepEqual(
    await prisma.crediario.findUnique({
      where: { clienteId: conta.clienteId },
    }),
    credito,
  );
  assert.equal(
    (await request(`/clientes/${conta.clienteId}`)).data.nome,
    "Nome atualizado",
  );
  assert.equal(
    (await request("/auth/me", { cookie })).data.usuario.cliente.idade,
    30,
  );
  const limpo = await request("/auth/me", {
    method: "PUT",
    cookie,
    body: {
      telefone: null,
      idade: null,
      profissao: "",
      estadoCivil: null,
    },
  });
  assert.equal(limpo.status, 200);
  assert.equal(limpo.data.usuario.cliente.email, dados.email);
  for (const campo of [
    "telefone",
    "idade",
    "profissao",
    "estadoCivil",
  ])
    assert.equal(limpo.data.usuario.cliente[campo], null);
  assert.equal(limpo.data.usuario.cliente.nome, "Nome atualizado");
  assert.equal((await login(dados)).status, 200);
});

test("recusa dados inválidos, CPF duplicado e campos de outra conta sem alterações parciais", async () => {
  const dados = novoCadastro();
  const conta = (await cadastrar(dados)).data.usuario;
  const outra = (await cadastrar(novoCadastro())).data.usuario;
  const { cookie } = await login(dados);
  const snapshot = () =>
    prisma.usuario.findUnique({
      where: { id: conta.id },
      include: { cliente: true },
    });
  const antes = await snapshot();
  for (const email of ["outro@example.com", "", null, dados.email]) {
    const resposta = await request("/auth/me", {
      method: "PUT",
      cookie,
      body: { nome: "Não salvar", email },
    });
    assert.equal(resposta.status, 400);
    assert.match(resposta.data.error, /e-mail não pode ser alterado/i);
    assert.deepEqual(await snapshot(), antes);
  }
  for (const body of [
    {},
    { nome: "" },
    { cpf: "00000000000" },
    { telefone: "123" },
    { email: "invalido" },
    { idade: 131 },
    { idade: "20" },
    { idade: 2.5 },
    { profissao: "a".repeat(151) },
    { id: outra.id },
    { clienteId: outra.clienteId },
    { papel: "ADMIN" },
    { senha: "Outra senha 123!" },
    { senhaHash: "x" },
    { cliente: { id: outra.clienteId } },
    { compras: [] },
    { crediario: { limiteCredito: 9999 } },
    { enderecos: [] },
  ]) {
    assert.equal(
      (await request("/auth/me", { method: "PUT", cookie, body })).status,
      400,
      JSON.stringify(body),
    );
  }
  assert.equal(
    (
      await request("/auth/me", {
        method: "PUT",
        cookie,
        body: { nome: "Não salvar", cpf: outra.cliente.cpf },
      })
    ).status,
    409,
  );
  const legadoCpf = novoCadastro().cpf;
  await prisma.cliente.create({
    data: {
      nome: "Legado",
      cpf: legadoCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"),
    },
  });
  assert.equal(
    (
      await request("/auth/me", {
        method: "PUT",
        cookie,
        body: { cpf: legadoCpf },
      })
    ).status,
    409,
  );
  assert.deepEqual(await snapshot(), antes);
  assert.equal(
    (await prisma.usuario.findUnique({ where: { id: outra.id } })).nome,
    outra.nome,
  );
});

test("edições simultâneas com mesmo CPF preservam a unicidade e a atomicidade", async () => {
  const primeira = novoCadastro(),
    segunda = novoCadastro();
  const contas = await Promise.all([cadastrar(primeira), cadastrar(segunda)]);
  const entradas = await Promise.all([login(primeira), login(segunda)]);
  const cpf = novoCadastro().cpf;
  const respostas = await Promise.all(
    entradas.map(({ cookie }, i) =>
      request("/auth/me", {
        method: "PUT",
        cookie,
        body: { nome: `Mudança ${i}`, cpf },
      }),
    ),
  );
  assert.deepEqual(respostas.map(({ status }) => status).sort(), [200, 409]);
  const indiceFalha = respostas.findIndex(({ status }) => status === 409);
  const preservado = await prisma.usuario.findUnique({
    where: { id: contas[indiceFalha].data.usuario.id },
    include: { cliente: true },
  });
  assert.equal(preservado.nome, "Cliente Conta Teste");
  assert.equal(preservado.cliente.nome, "Cliente Conta Teste");
  assert.equal(await prisma.cliente.count({ where: { cpf } }), 1);
});

test("endereços da conta têm CRUD validado e isolamento do proprietário", async () => {
  const dados = novoCadastro();
  const conta = (await cadastrar(dados)).data.usuario;
  const outra = (await cadastrar(novoCadastro({ enderecos: [endereco] }))).data
    .usuario;
  const alheio = outra.cliente.enderecos[0];
  const { cookie } = await login(dados);
  const criar = (body) =>
    request("/auth/me/enderecos", { method: "POST", cookie, body });
  assert.equal((await criar({ ...endereco, estado: "XX" })).status, 400);
  assert.equal((await criar({ ...endereco, cep: "1" })).status, 400);
  assert.equal(
    (await criar({ ...endereco, clienteId: outra.clienteId })).status,
    400,
  );
  const criado = await criar(endereco);
  assert.equal(criado.status, 201);
  assert.equal(criado.data.clienteId, conta.clienteId);
  assert.equal(criado.data.cep, "55290000");
  assert.equal(criado.data.estado, "PE");
  const editado = await request(`/auth/me/enderecos/${criado.data.id}`, {
    method: "PUT",
    cookie,
    body: { numero: "s/n", complemento: "  Casa  " },
  });
  assert.equal(editado.status, 200);
  assert.equal(editado.data.complemento, "Casa");
  assert.equal(editado.data.logradouro, endereco.logradouro);
  for (const method of ["PUT", "DELETE"]) {
    assert.equal(
      (
        await request(`/auth/me/enderecos/${alheio.id}`, {
          method,
          cookie,
          ...(method === "PUT" ? { body: { numero: "99" } } : {}),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/auth/me/enderecos/invalido", {
          method,
          cookie,
          ...(method === "PUT" ? { body: { numero: "99" } } : {}),
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (
      await request(`/auth/me/enderecos/${criado.data.id}`, {
        method: "PUT",
        cookie,
        body: { clienteId: outra.clienteId },
      })
    ).status,
    400,
  );
  assert.equal(
    (await request("/auth/me", { cookie })).data.usuario.cliente.enderecos[0]
      .numero,
    "s/n",
  );
  assert.equal(
    (
      await request(`/auth/me/enderecos/${criado.data.id}`, {
        method: "DELETE",
        cookie,
      })
    ).status,
    204,
  );
  assert.equal(
    (await request("/auth/me", { cookie })).data.usuario.cliente.enderecos
      .length,
    0,
  );
  assert.equal(
    await prisma.enderecoCliente.count({ where: { id: alheio.id } }),
    1,
  );
});

test("todas as edições exigem sessão de cliente válida e origem permitida", async () => {
  const dados = novoCadastro();
  const conta = (await cadastrar(dados)).data.usuario;
  const { cookie } = await login(dados);
  const operacoes = [
    ["/auth/me", "PUT", { nome: "Atualizado" }],
    ["/auth/me/enderecos", "POST", endereco],
    ["/auth/me/enderecos/1", "PUT", { numero: "2" }],
    ["/auth/me/enderecos/1", "DELETE", undefined],
  ];
  for (const [path, method, body] of operacoes) {
    assert.equal((await request(path, { method, body })).status, 401);
    assert.equal(
      (
        await request(path, {
          method,
          body,
          cookie,
          origin: "https://fora.example",
        })
      ).status,
      403,
    );
  }
  await prisma.usuario.update({
    where: { id: conta.id },
    data: { papel: "ADMIN" },
  });
  assert.equal(
    (
      await request("/auth/me", {
        method: "PUT",
        cookie,
        body: { nome: "Não salvar" },
      })
    ).status,
    401,
  );
  await prisma.usuario.update({
    where: { id: conta.id },
    data: { papel: "CLIENTE" },
  });
  await prisma.sessaoUsuario.updateMany({
    where: { usuarioId: conta.id },
    data: { expiraEm: new Date(0) },
  });
  for (const [path, method, body] of operacoes)
    assert.equal((await request(path, { method, body, cookie })).status, 401);
  assert.equal(
    (await prisma.usuario.findUnique({ where: { id: conta.id } })).nome,
    dados.nome,
  );
});

test("rejeita origem estranha, formato de corpo e JSON inválidos; permite preflight da loja", async () => {
  const origem = "http://localhost:5174";
  assert.equal(
    (
      await request("/auth/cadastro", {
        method: "POST",
        body: novoCadastro(),
        origin: "https://fora.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/auth/logout", {
        method: "POST",
        raw: "texto",
        contentType: "text/plain",
      })
    ).status,
    415,
  );
  const invalido = await request("/auth/cadastro", {
    method: "POST",
    raw: "{",
    origin: origem,
  });
  assert.equal(invalido.status, 400);
  assert.equal(invalido.headers.get("access-control-allow-origin"), origem);
  assert.equal(
    (
      await request("/auth/cadastro", {
        method: "POST",
        body: { nome: "x".repeat(40000) },
      })
    ).status,
    413,
  );
  const preflight = await request("/auth/login", {
    method: "OPTIONS",
    origin: origem,
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), origem);
  assert.equal(
    preflight.headers.get("access-control-allow-credentials"),
    "true",
  );
});
