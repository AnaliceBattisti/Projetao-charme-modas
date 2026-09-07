import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";

// Um schema exclusivo é criado e removido por execução; nunca usa DATABASE_URL como fallback.
if (!process.env.TEST_DATABASE_URL) throw new Error("Defina TEST_DATABASE_URL para executar os testes de integração.");
const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) throw new Error("TEST_DATABASE_URL deve apontar para PostgreSQL.");
const schema = `clientes_test_${randomUUID().replaceAll("-", "")}`;
databaseUrl.searchParams.set("schema", schema);
process.env.DATABASE_URL = databaseUrl.toString();
const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
let server;
let baseUrl;
let cpfSequence = 100000000;
const endereco = { cep: "55290-000", logradouro: "Rua de Teste", numero: "10", bairro: "Centro", cidade: "Garanhuns", estado: "pe" };

function nextCpf() {
  let digits = String(cpfSequence++);
  for (let length = 9; length <= 10; length++) {
    const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    digits += remainder === 10 ? "0" : String(remainder);
  }
  return digits;
}

async function request(path, { method = "GET", body, raw } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    signal: AbortSignal.timeout(10000),
  });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, headers: response.headers };
}

async function createCliente(extra = {}) {
  const result = await request("/clientes", { method: "POST", body: { nome: "Cliente Teste", cpf: nextCpf(), ...extra } });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data;
}

before(async () => {
  execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), env: process.env, stdio: "pipe", windowsHide: true,
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  try {
    // O identificador só contém o prefixo constante e um UUID gerado neste processo.
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
});

test("cadastra cliente com e-mail e vários endereços na mesma operação", async () => {
  const result = await request("/clientes", { method: "POST", body: {
    nome: " Maria Integração ", cpf: "529.982.247-25", idade: 30, profissao: "Professora", estadoCivil: "Solteira",
    email: " MARIA@EXAMPLE.COM ", telefone: "+55 (87) 99999-0000", enderecos: [endereco, { ...endereco, numero: "20" }],
  } });
  assert.equal(result.status, 201);
  assert.equal(result.headers.get("location"), `/clientes/${result.data.id}`);
  assert.equal(result.data.nome, "Maria Integração");
  assert.equal(result.data.cpf, "52998224725");
  assert.equal(result.data.email, "maria@example.com");
  assert.equal(result.data.telefone, "87999990000");
  assert.equal(result.data.crediario, null);
  assert.equal(result.data.enderecos.length, 2);
  assert.equal(result.data.enderecos[0].cep, "55290000");
  assert.equal(result.data.enderecos[0].estado, "PE");
  const detail = await request(`/clientes/${result.data.id}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.data.compras, []);
  assert.equal(detail.data.enderecos.length, 2);
});

test("não persiste cadastro com endereço inválido e rejeita alterações indevidas", async () => {
  const cpf = nextCpf();
  for (const body of [{ nome: "Teste", cpf, enderecos: [endereco, { ...endereco, cep: "x" }] },
    { nome: "Teste", cpf, crediario: { create: { limiteCredito: 999 } } },
    { nome: "Teste", cpf, email: "inválido" }, { nome: "Teste", cpf, idade: -1 }]) {
    assert.equal((await request("/clientes", { method: "POST", body })).status, 400);
  }
  assert.equal(await prisma.cliente.count({ where: { cpf } }), 0);
});

test("impede CPF duplicado, inclusive máscara antiga e requisições simultâneas", async () => {
  const cpf = nextCpf();
  const formatted = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  const simultaneous = await Promise.all([cpf, formatted].map((value) => request("/clientes", { method: "POST", body: { nome: "Concorrente", cpf: value } })));
  assert.deepEqual(simultaneous.map((result) => result.status).sort(), [201, 409]);
  assert.equal(await prisma.cliente.count({ where: { cpf } }), 1);
  const legacyCpf = nextCpf();
  await prisma.cliente.create({ data: { nome: "Legado", cpf: legacyCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") } });
  assert.equal((await request("/clientes", { method: "POST", body: { nome: "Duplicado", cpf: legacyCpf } })).status, 409);
});

test("edita parcialmente, limpa opcionais e impede CPF de outro cliente", async () => {
  const cliente = await createCliente({ email: "teste@example.com", telefone: "87999990000" });
  const other = await createCliente();
  const result = await request(`/clientes/${cliente.id}`, { method: "PUT", body: { nome: "Nome Editado", email: null, telefone: "", cpf: cliente.cpf } });
  assert.equal(result.status, 200);
  assert.equal(result.data.nome, "Nome Editado");
  assert.equal(result.data.email, null);
  assert.equal(result.data.telefone, null);
  assert.equal(result.data.cpf, cliente.cpf);
  assert.equal((await request(`/clientes/${cliente.id}`, { method: "PUT", body: { cpf: other.cpf } })).status, 409);
  for (const body of [{}, { id: other.id }, { enderecos: [] }, { compras: { deleteMany: {} } }]) {
    assert.equal((await request(`/clientes/${cliente.id}`, { method: "PUT", body })).status, 400);
  }
});

test("lista clientes e busca por nome sem distinguir maiúsculas ou por CPF", async () => {
  const cliente = await createCliente({ nome: "BuscaExclusiva Teste" });
  for (const term of ["buscaexclusiva", cliente.cpf, cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")]) {
    const result = await request(`/clientes?busca=${encodeURIComponent(term)}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.data.map((entry) => entry.id), [cliente.id]);
  }
  assert.deepEqual((await request("/clientes?busca=SemCorrespondenciaXYZ")).data, []);
  assert.equal((await request("/clientes?busca[a]=x")).status, 400);
  assert.ok(Array.isArray((await request("/clientes")).data));
});

test("gerencia endereços e não permite editar ou excluir endereço de outro cliente", async () => {
  const cliente = await createCliente();
  const other = await createCliente();
  const created = await request(`/clientes/${cliente.id}/enderecos`, { method: "POST", body: endereco });
  assert.equal(created.status, 201);
  const path = `/clientes/${cliente.id}/enderecos/${created.data.id}`;
  assert.equal((await request(`/clientes/${cliente.id}/enderecos`)).data.length, 1);
  for (const method of ["PUT", "DELETE"]) {
    assert.equal((await request(`/clientes/${other.id}/enderecos/${created.data.id}`, { method, ...(method === "PUT" ? { body: { numero: "99" } } : {}) })).status, 404);
  }
  assert.equal((await request(path, { method: "PUT", body: { clienteId: other.id } })).status, 400);
  const updated = await request(path, { method: "PUT", body: { numero: "30", complemento: "Apto 2" } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.numero, "30");
  assert.equal(updated.data.logradouro, endereco.logradouro);
  assert.equal((await request(path, { method: "DELETE" })).status, 204);
  assert.deepEqual((await request(`/clientes/${cliente.id}/enderecos`)).data, []);
});

test("detalha histórico com itens, produtos, parcelas e crediário; protege vínculos na exclusão", async () => {
  const cliente = await createCliente({ enderecos: [endereco] });
  const other = await createCliente();
  const produto = await prisma.produto.create({ data: {
    nome: "Vestido de teste", precoCusto: "50.00", precoVenda: "100.00",
    fornecedor: { create: { nomeRazaoSocial: "Fornecedor Teste", cnpj: "teste-integracao" } },
    variacoes: { create: { cor: "Azul", tamanho: "M" } },
  }, include: { variacoes: true } });
  const compra = await prisma.compra.create({ data: {
    clienteId: cliente.id, data: new Date("2026-09-01T12:00:00Z"), valorTotal: "100.00", formaPagamento: "crediario",
    itens: { create: { variacaoId: produto.variacoes[0].id, quantidade: 1, precoUnitario: "100.00" } },
    parcelas: { create: [
      { numero: 2, valor: "50.00", dataVencimento: new Date("2026-11-01T12:00:00Z") },
      { numero: 1, valor: "50.00", dataVencimento: new Date("2026-10-01T12:00:00Z") },
    ] },
  } });
  const recent = await prisma.compra.create({ data: { clienteId: cliente.id, data: new Date("2026-09-02T12:00:00Z"), valorTotal: "20.00", formaPagamento: "pix" } });
  await prisma.compra.create({ data: { clienteId: other.id, valorTotal: "10.00", formaPagamento: "pix" } });
  const history = await request(`/clientes/${cliente.id}/compras`);
  assert.equal(history.status, 200);
  assert.deepEqual(history.data.map((entry) => entry.id), [recent.id, compra.id]);
  assert.equal(history.data[1].itens[0].variacao.produto.nome, "Vestido de teste");
  assert.deepEqual(history.data[1].parcelas.map((entry) => entry.numero), [1, 2]);
  assert.equal((await request(`/clientes/${cliente.id}`, { method: "DELETE" })).status, 409);
  assert.equal(await prisma.enderecoCliente.count({ where: { clienteId: cliente.id } }), 1);
  const withCredit = await createCliente();
  await prisma.crediario.create({ data: { clienteId: withCredit.id, limiteCredito: "500.00" } });
  assert.equal((await request(`/clientes/${withCredit.id}`, { method: "DELETE" })).status, 409);
  const detail = await request(`/clientes/${withCredit.id}`);
  assert.equal(detail.data.crediario.status, "ATIVO");
  assert.deepEqual((await request(`/clientes/${cliente.id}`)).data.compras, history.data);
});

test("exclui cadastro sem vínculos financeiros e seus endereços", async () => {
  const cliente = await createCliente({ enderecos: [endereco] });
  const result = await request(`/clientes/${cliente.id}`, { method: "DELETE" });
  assert.equal(result.status, 204);
  assert.equal(result.data, null);
  assert.equal(await prisma.enderecoCliente.count({ where: { clienteId: cliente.id } }), 0);
  assert.equal((await request(`/clientes/${cliente.id}`)).status, 404);
});

test("retorna JSON e status adequados para IDs inválidos, inexistentes e JSON malformado", async () => {
  for (const id of ["abc", "0", "-1", "1.2", "2147483648"]) {
    const result = await request(`/clientes/${id}`);
    assert.equal(result.status, 400);
    assert.equal(typeof result.data.error, "string");
  }
  for (const path of ["/clientes/2147483647", "/clientes/2147483647/compras", "/clientes/2147483647/enderecos"]) {
    assert.equal((await request(path)).status, 404);
  }
  assert.equal((await request("/clientes/2147483647", { method: "PUT", body: { nome: "Ausente" } })).status, 404);
  assert.equal((await request("/clientes/2147483647", { method: "DELETE" })).status, 404);
  assert.equal((await request("/clientes/2147483647/enderecos", { method: "POST", body: endereco })).status, 404);
  assert.equal((await request("/clientes", { method: "POST", raw: "{" })).status, 400);
  assert.equal((await request("/clientes", { method: "POST", raw: '"texto"' })).status, 400);
  assert.equal((await request("/clientes", { method: "POST", body: [] })).status, 400);
  assert.equal((await request("/clientes", { method: "POST", body: { nome: "x".repeat(110000) } })).status, 413);
  assert.equal((await request("/health")).status, 200);
});
