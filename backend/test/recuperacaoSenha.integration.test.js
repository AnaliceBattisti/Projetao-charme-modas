import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as aguardar } from "node:timers/promises";
import { smtpDeTeste } from "./helpers/smtp.js";
import { gerarSenhaHash, verificarSenha } from "../src/lib/senhas.js";
import { configuracaoEmail, ConfiguracaoEmailError } from "../src/lib/email.js";

if (!process.env.TEST_DATABASE_URL)
  throw new Error("Defina TEST_DATABASE_URL para executar os testes.");
const url = new URL(process.env.TEST_DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(url.protocol))
  throw new Error("Use PostgreSQL nos testes.");
const schema = `recuperacao_test_${randomUUID().replaceAll("-", "")}`;
url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();
process.env.LOJA_ORIGENS = "http://localhost:5174";
process.env.LOJA_URL = "http://localhost:5174";
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_SECURE = "false";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.EMAIL_FROM = "contato@charme-modas.test";
process.env.NODE_ENV = "test";
const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
let smtp, server, base;
const senhaAnterior = "Senha anterior 123!";
const senhaNova = "Nova senha segura 456!";
const hash = (token) => createHash("sha256").update(token).digest("hex");

async function ate(condicao) {
  for (let i = 0; i < 100; i++) {
    const resultado = await condicao();
    if (resultado) return resultado;
    await aguardar(50);
  }
  throw new Error("Tempo esgotado aguardando processamento SMTP.");
}

async function conta(extra = {}) {
  return prisma.usuario.create({
    data: {
      nome: "Teste recuperação",
      email: `recuperacao-${randomUUID()}@example.com`,
      senhaHash: await gerarSenhaHash(senhaAnterior),
      papel: "CLIENTE",
      cliente: {
        create: {
          nome: "Teste recuperação",
          cpf: randomUUID(),
          email: `contato-${randomUUID()}@example.com`,
          telefone: "87999990000",
          crediario: { create: { limiteCredito: 150, limiteDisponivel: 150 } },
        },
      },
      ...extra,
    },
    include: {
      cliente: { include: { crediario: true, enderecos: true, compras: true } },
    },
  });
}
async function request(path, body, headers = {}, method = "POST") {
  const res = await fetch(`${base}/auth${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return {
    status: res.status,
    body: await res.json(),
    cookie: res.headers.get("set-cookie"),
    headers: res.headers,
  };
}
const pedir = (email) => request("/esqueci-senha", { email });
const redefinir = (token, extra = {}) =>
  request("/redefinir-senha", {
    token,
    senha: senhaNova,
    confirmacao: senhaNova,
    ...extra,
  });
async function receber(usuario) {
  const resposta = await pedir(usuario.email);
  assert.equal(resposta.status, 202);
  const mensagem = await ate(() =>
    smtp.mensagens.find(
      (m) => m.destinatario === usuario.email && m.text.includes("#token="),
    ),
  );
  const token = mensagem.text.match(/#token=([a-f0-9]{64})/)[1];
  return { resposta, mensagem, token };
}
async function criarToken(usuarioId, expiraEm = new Date(Date.now() + 60000)) {
  const token = randomBytes(32).toString("hex");
  await prisma.recuperacaoSenha.upsert({
    where: { usuarioId },
    create: { usuarioId, tokenHash: hash(token), expiraEm },
    update: { tokenHash: hash(token), expiraEm },
  });
  return token;
}

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
    { env: process.env, stdio: "pipe", windowsHide: true },
  );
  smtp = await smtpDeTeste();
  process.env.SMTP_PORT = String(smtp.port);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await aguardar(250);
  if (smtp) await smtp.close();
  try {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
});

test("recupera por SMTP, protege token, preserva cliente e revoga sessões", async () => {
  const usuario = await conta();
  const entrada = await request("/login", {
    email: usuario.email,
    senha: senhaAnterior,
  });
  const entrada2 = await request("/login", {
    email: usuario.email,
    senha: senhaAnterior,
  });
  const { resposta, mensagem, token } = await receber(usuario);
  assert.match(
    mensagem.text,
    /http:\/\/localhost:5174\/redefinir-senha#token=/,
  );
  assert.equal(JSON.stringify(resposta.body).includes(token), false);
  assert.equal(resposta.headers.get("cache-control"), "no-store");
  const registro = await prisma.recuperacaoSenha.findUnique({
    where: { usuarioId: usuario.id },
  });
  assert.equal(registro.tokenHash, hash(token));
  assert.ok(registro.expiraEm - registro.criadoEm >= 29 * 60000);
  assert.ok(registro.expiraEm - registro.criadoEm <= 31 * 60000);
  assert.equal(
    (await prisma.usuario.findUnique({ where: { id: usuario.id } })).senhaHash,
    usuario.senhaHash,
  );
  assert.equal((await redefinir(token)).status, 200);
  const depois = await prisma.usuario.findUnique({
    where: { id: usuario.id },
    include: {
      cliente: { include: { crediario: true, enderecos: true, compras: true } },
    },
  });
  assert.deepEqual({ ...depois, senhaHash: usuario.senhaHash }, usuario);
  assert.equal(await verificarSenha(senhaNova, depois.senhaHash), true);
  assert.equal(
    await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } }),
    0,
  );
  for (const entradaAnterior of [entrada, entrada2]) {
    assert.equal(
      (
        await request(
          "/me",
          undefined,
          { Cookie: entradaAnterior.cookie.split(";")[0] },
          "GET",
        )
      ).status,
      401,
    );
  }
  assert.equal(
    (await request("/login", { email: usuario.email, senha: senhaAnterior }))
      .status,
    401,
  );
  assert.equal(
    (await request("/login", { email: usuario.email, senha: senhaNova }))
      .status,
    200,
  );
  assert.equal((await redefinir(token)).status, 400);
  await ate(() =>
    smtp.mensagens.some(
      (m) => m.destinatario === usuario.email && !m.text.includes("#token="),
    ),
  );
  assert.ok(
    smtp.mensagens.every(
      (m) => !m.text.includes(senhaNova) && !m.text.includes(senhaAnterior),
    ),
  );
});

test("mesma resposta para inexistente e papéis internos; entrega somente ao e-mail de acesso", async () => {
  const usuario = await conta();
  const interno = await conta({ papel: "ADMIN", cliente: undefined });
  const desvinculado = await conta({ cliente: undefined });
  const { resposta } = await receber(usuario);
  for (const email of [
    "inexistente@example.com",
    interno.email,
    desvinculado.email,
    usuario.cliente.email,
  ]) {
    const resultado = await pedir(email);
    assert.equal(resultado.status, resposta.status);
    assert.deepEqual(resultado.body, resposta.body);
  }
  await aguardar(250);
  assert.ok(
    smtp.mensagens.every(
      (m) =>
        ![interno.email, desvinculado.email, usuario.cliente.email].includes(
          m.destinatario,
        ),
    ),
  );
  assert.equal(
    await prisma.recuperacaoSenha.count({
      where: { usuarioId: { in: [interno.id, desvinculado.id] } },
    }),
    0,
  );
});

test("impede reenvios em cinco minutos e invalida o link anterior ao reenviar", async () => {
  const usuario = await conta();
  const { token } = await receber(usuario);
  await pedir(usuario.email.toUpperCase());
  await aguardar(150);
  assert.equal(
    smtp.mensagens.filter((m) => m.destinatario === usuario.email).length,
    1,
  );
  await prisma.recuperacaoSenha.update({
    where: { usuarioId: usuario.id },
    data: { criadoEm: new Date(Date.now() - 6 * 60000) },
  });
  await Promise.all([pedir(usuario.email), pedir(usuario.email)]);
  await ate(
    () =>
      smtp.mensagens.filter((m) => m.destinatario === usuario.email).length ===
      2,
  );
  await aguardar(150);
  assert.equal(
    smtp.mensagens.filter((m) => m.destinatario === usuario.email).length,
    2,
  );
  assert.equal((await redefinir(token)).status, 400);
});

test("recusa token vencido, inválido, senha fraca, confirmação divergente e campos extras", async () => {
  const usuario = await conta();
  const token = await criarToken(usuario.id);
  for (const dados of [
    { senha: "curta", confirmacao: "curta" },
    { senha: " ".repeat(8), confirmacao: " ".repeat(8) },
    { senha: "a".repeat(129), confirmacao: "a".repeat(129) },
    { confirmacao: "Diferente123" },
    { papel: "ADMIN" },
    { usuarioId: usuario.id },
    { email: "outro@example.com" },
  ])
    assert.equal((await redefinir(token, dados)).status, 400);
  for (const tokenInvalido of ["invalido", "f".repeat(64), null])
    assert.equal((await redefinir(tokenInvalido)).status, 400);
  await prisma.recuperacaoSenha.update({
    where: { usuarioId: usuario.id },
    data: { expiraEm: new Date(0) },
  });
  assert.equal((await redefinir(token)).status, 400);
  assert.equal(
    (await prisma.usuario.findUnique({ where: { id: usuario.id } })).senhaHash,
    usuario.senhaHash,
  );
  const interno = await conta({ papel: "OPERADOR", cliente: undefined });
  assert.equal((await redefinir(await criarToken(interno.id))).status, 400);
});

test("consumo simultâneo permite somente uma troca", async () => {
  const usuario = await conta();
  const token = await criarToken(usuario.id);
  const respostas = await Promise.all([redefinir(token), redefinir(token)]);
  assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 400]);
  await ate(() => smtp.mensagens.some((m) => m.destinatario === usuario.email));
});

test("mantém proteção de origem, JSON e configuração SMTP", async () => {
  assert.equal(
    (
      await request(
        "/esqueci-senha",
        { email: "teste@example.com" },
        { Origin: "https://site-alheio.test" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/esqueci-senha",
        { email: "teste@example.com" },
        { "Content-Type": "text/plain" },
      )
    ).status,
    415,
  );
  for (const body of [
    { email: "invalido" },
    { email: "teste@example.com", papel: "ADMIN" },
    {},
    [],
  ]) {
    assert.equal((await request("/esqueci-senha", body)).status, 400);
  }
  const host = process.env.SMTP_HOST;
  delete process.env.SMTP_HOST;
  try {
    assert.equal((await pedir("teste@example.com")).status, 503);
  } finally {
    process.env.SMTP_HOST = host;
  }
  process.env.NODE_ENV = "production";
  try {
    assert.throws(configuracaoEmail, ConfiguracaoEmailError);
  } finally {
    process.env.NODE_ENV = "test";
  }
  process.env.SMTP_HOST = "smtp.example.com";
  try {
    assert.equal(configuracaoEmail().smtp.requireTLS, true);
  } finally {
    process.env.SMTP_HOST = host;
  }
});

test("falha SMTP elimina token e mantém senha e resposta genérica", async () => {
  const usuario = await conta();
  smtp.falhar = true;
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.join(" "));
  try {
    assert.equal((await pedir(usuario.email)).status, 202);
    await ate(() => logs.length);
    assert.equal(
      await prisma.recuperacaoSenha.count({ where: { usuarioId: usuario.id } }),
      0,
    );
    assert.equal(
      (await prisma.usuario.findUnique({ where: { id: usuario.id } }))
        .senhaHash,
      usuario.senhaHash,
    );
    assert.ok(
      logs.every(
        (log) => !log.includes(usuario.email) && !log.includes(senhaAnterior),
      ),
    );
  } finally {
    smtp.falhar = false;
    console.error = original;
  }
});

test("limita solicitações por IP sem bloquear o login", async () => {
  let resultado;
  for (let i = 0; i <= 30; i++) {
    resultado = await pedir("inexistente@example.com");
    if (resultado.status === 429) break;
  }
  assert.equal(resultado.status, 429);
  assert.ok(Number(resultado.headers.get("retry-after")) > 0);
  assert.equal(
    (
      await request("/login", {
        email: "inexistente@example.com",
        senha: senhaAnterior,
      })
    ).status,
    401,
  );
});
