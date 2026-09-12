import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { before, after, test } from "node:test";
import { gerarSenhaHash } from "../src/lib/senhas.js";

if (!process.env.TEST_DATABASE_URL) throw new Error("Defina TEST_DATABASE_URL para executar os testes de integração.");
const databaseUrl = new URL(process.env.TEST_DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) throw new Error("Use um PostgreSQL de testes.");
const schema = `pedidos_test_${randomUUID().replaceAll("-", "")}`;
databaseUrl.searchParams.set("schema", schema);
process.env.DATABASE_URL = databaseUrl.toString();
const { prisma } = await import("../src/lib/prisma.js");
const { app } = await import("../src/app.js");
let server, baseUrl, fornecedor, senhaHash;

async function request(path, { method = "POST", body, cookie, origin } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

async function novaConta(limite = 500) {
  const usuario = await prisma.usuario.create({
    data: {
      nome: "Cliente Pedido", email: `${randomUUID()}@example.com`, senhaHash,
      cliente: { create: { nome: "Cliente Pedido", cpf: randomUUID(), telefone: "87999990000", crediario: { create: { limiteCredito: limite, limiteDisponivel: limite } } } },
    },
  });
  const entrada = await request("/auth/login", { body: { email: usuario.email, senha: "Senha teste 123!" } });
  assert.equal(entrada.status, 200);
  return { ...usuario, cookie: entrada.cookie };
}

async function novaVariacao(estoque = 10, preco = "49.99") {
  const produto = await prisma.produto.create({
    data: { nome: "Peça de teste", fornecedorId: fornecedor.id, precoCusto: "10", precoVenda: preco, variacoes: { create: { tamanho: "M", cor: "Rosa", estoqueAtual: estoque } } },
    include: { variacoes: true },
  });
  return produto.variacoes[0];
}
const dadosPedido = (variacao, extra = {}) => ({ chavePedido: randomUUID(), formaPagamento: "CREDIARIO", itens: [{ variacaoId: variacao.id, quantidade: 2 }], ...extra });
const enviar = (conta, body) => request("/auth/me/pedidos", { cookie: conta.cookie, body });
const aprovar = (id, numeroParcelas = 1) => request(`/compras/${id}/aprovar`, { method: "PUT", body: { numeroParcelas } });
const cancelar = (id) => request(`/compras/${id}/cancelar`, { method: "PUT" });
const estoque = async (id) => (await prisma.variacao.findUnique({ where: { id } })).estoqueAtual;
const limite = async (clienteId) => Number((await prisma.crediario.findUnique({ where: { clienteId } })).limiteDisponivel);

before(async () => {
  execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url)), "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)), env: process.env, stdio: "pipe", windowsHide: true,
  });
  senhaHash = await gerarSenhaHash("Senha teste 123!");
  fornecedor = await prisma.fornecedor.create({ data: { nomeRazaoSocial: "Fornecedor Teste", cnpj: randomUUID() } });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
  finally { await prisma.$disconnect(); }
});

test("envia pedido com preço do catálogo sem baixar estoque, consumir limite ou gerar parcelas", async () => {
  const conta = await novaConta(0);
  const variacao = await novaVariacao();
  const enviado = await enviar(conta, dadosPedido(variacao));
  assert.equal(enviado.status, 201, JSON.stringify(enviado.data));
  const { pedido } = enviado.data;
  assert.equal(pedido.status, "SOLICITADA");
  assert.equal(pedido.clienteId, conta.clienteId);
  assert.equal(Number(pedido.valorTotal), 99.98);
  assert.equal(Number(pedido.itens[0].precoUnitario), 49.99);
  assert.equal(await estoque(variacao.id), 10);
  assert.equal(await limite(conta.clienteId), 0);
  assert.equal(await prisma.parcela.count({ where: { compraId: pedido.id } }), 0);
  assert.equal(await prisma.movimentacaoEstoque.count({ where: { variacaoId: variacao.id } }), 0);
  const painel = await request(`/compras/${pedido.id}`, { method: "GET" });
  assert.equal(painel.data.status, "SOLICITADA");
  assert.equal(painel.data.cliente.id, conta.clienteId);
});

test("reenvios simultâneos salvam um único pedido e não permitem reaproveitar chave alheia", async () => {
  const conta = await novaConta();
  const outra = await novaConta();
  const dados = dadosPedido(await novaVariacao());
  const respostas = await Promise.all([enviar(conta, dados), enviar(conta, dados)]);
  assert.deepEqual(respostas.map((r) => r.status), [201, 201]);
  assert.equal(respostas[0].data.pedido.id, respostas[1].data.pedido.id);
  assert.equal(await prisma.compra.count({ where: { chavePedido: dados.chavePedido } }), 1);
  assert.equal((await enviar(outra, dados)).status, 400);
  assert.equal((await enviar(conta, { ...dados, formaPagamento: "A_VISTA" })).status, 400);
});

test("envio exige sessão, origem permitida e aceita somente as duas opções e itens válidos", async () => {
  const conta = await novaConta();
  const dados = dadosPedido(await novaVariacao());
  assert.equal((await request("/auth/me/pedidos", { body: dados })).status, 401);
  assert.equal((await request("/auth/me/pedidos", { body: dados, cookie: conta.cookie, origin: "https://fora.example" })).status, 403);
  for (const extra of [
    { formaPagamento: "PIX" }, { formaPagamento: "CARTAO_CREDITO" }, { clienteId: conta.clienteId },
    { status: "CONCLUIDA" }, { valorTotal: 1 }, { chavePedido: "invalida" }, { itens: [] },
    { itens: [dados.itens[0], dados.itens[0]] },
    { itens: [{ ...dados.itens[0], precoUnitario: 0.01 }] },
    ...[0, -1, 1.5, "2", 100].map((quantidade) => ({ itens: [{ ...dados.itens[0], quantidade }] })),
  ]) assert.equal((await enviar(conta, { ...dados, ...extra })).status, 400, JSON.stringify(extra));
  assert.equal(await prisma.compra.count({ where: { clienteId: conta.clienteId } }), 0);
});

test("aprovação no crediário efetiva venda e distribui todos os centavos nas parcelas", async () => {
  const conta = await novaConta();
  const variacao = await novaVariacao();
  const { pedido } = (await enviar(conta, dadosPedido(variacao))).data;
  const resultado = await aprovar(pedido.id, 3);
  assert.equal(resultado.status, 200, JSON.stringify(resultado.data));
  assert.equal(resultado.data.status, "CONCLUIDA");
  assert.equal(await estoque(variacao.id), 8);
  assert.equal(await limite(conta.clienteId), 400.02);
  assert.deepEqual(resultado.data.parcelas.sort((a, b) => a.numero - b.numero).map((p) => Number(p.valor)), [33.34, 33.32, 33.32]);
  assert.equal(await prisma.movimentacaoEstoque.count({ where: { variacaoId: variacao.id } }), 1);
  assert.equal((await aprovar(pedido.id, 3)).status, 400);
  assert.equal(await estoque(variacao.id), 8);
});

test("pedido à vista só baixa estoque na aprovação e nunca usa crediário", async () => {
  const conta = await novaConta(0);
  const variacao = await novaVariacao();
  const { pedido } = (await enviar(conta, dadosPedido(variacao, { formaPagamento: "A_VISTA" }))).data;
  assert.equal(await estoque(variacao.id), 10);
  assert.equal((await aprovar(pedido.id, 2)).status, 400);
  const resultado = await aprovar(pedido.id);
  assert.equal(resultado.status, 200);
  assert.equal(await estoque(variacao.id), 8);
  assert.equal(await limite(conta.clienteId), 0);
  assert.deepEqual(resultado.data.parcelas, []);
});

test("falhas de limite e estoque na aprovação desfazem toda a operação", async () => {
  const conta = await novaConta(1);
  const variacao = await novaVariacao();
  const { pedido } = (await enviar(conta, dadosPedido(variacao))).data;
  assert.equal((await aprovar(pedido.id)).status, 400);
  assert.equal(await estoque(variacao.id), 10);
  assert.equal(await limite(conta.clienteId), 1);
  assert.equal((await prisma.compra.findUnique({ where: { id: pedido.id } })).status, "SOLICITADA");
  assert.equal(await prisma.movimentacaoEstoque.count({ where: { variacaoId: variacao.id } }), 0);
  assert.equal(await prisma.parcela.count({ where: { compraId: pedido.id } }), 0);

  const outraVariacao = await novaVariacao();
  const enviado = await enviar(conta, dadosPedido(variacao, { formaPagamento: "A_VISTA", itens: [{ variacaoId: variacao.id, quantidade: 2 }, { variacaoId: outraVariacao.id, quantidade: 2 }] }));
  await prisma.variacao.update({ where: { id: outraVariacao.id }, data: { estoqueAtual: 0 } });
  assert.equal((await aprovar(enviado.data.pedido.id)).status, 400);
  assert.equal(await estoque(variacao.id), 10);
  assert.equal((await prisma.compra.findUnique({ where: { id: enviado.data.pedido.id } })).status, "SOLICITADA");
  assert.equal((await enviar(conta, dadosPedido(outraVariacao))).status, 400);
});

test("cancelar uma solicitação não aumenta estoque nem limite e impede aprovação posterior", async () => {
  const conta = await novaConta();
  const variacao = await novaVariacao();
  const { pedido } = (await enviar(conta, dadosPedido(variacao))).data;
  assert.equal((await cancelar(pedido.id)).status, 200);
  assert.equal(await estoque(variacao.id), 10);
  assert.equal(await limite(conta.clienteId), 500);
  assert.equal(await prisma.movimentacaoEstoque.count({ where: { variacaoId: variacao.id } }), 0);
  assert.equal((await cancelar(pedido.id)).status, 400);
  assert.equal((await aprovar(pedido.id)).status, 400);
});

test("aprovações concorrentes não vendem acima do estoque e não descontam limite duas vezes", async () => {
  const conta = await novaConta();
  const variacao = await novaVariacao(2);
  const primeiro = (await enviar(conta, dadosPedido(variacao))).data.pedido;
  const segundo = (await enviar(conta, dadosPedido(variacao))).data.pedido;
  const respostas = await Promise.all([aprovar(primeiro.id), aprovar(segundo.id)]);
  assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 400]);
  assert.equal(await estoque(variacao.id), 0);
  assert.equal(await limite(conta.clienteId), 400.02);
  const aprovado = respostas.find((r) => r.status === 200).data;
  const repeticoes = await Promise.all([aprovar(aprovado.id), aprovar(aprovado.id)]);
  assert.deepEqual(repeticoes.map((r) => r.status), [400, 400]);
  assert.equal(await limite(conta.clienteId), 400.02);
});

async function pedidoRegistrado(conta, variacao, extra = {}) {
  return prisma.compra.create({
    data: {
      clienteId: conta.clienteId, chavePedido: randomUUID(), formaPagamento: "CREDIARIO",
      status: "SOLICITADA", valorTotal: "99.98",
      itens: { create: { variacaoId: variacao.id, quantidade: 2, precoUnitario: "49.99" } },
      ...extra,
    },
  });
}

test("meus pedidos lista apenas o cliente da sessão, com paginação e ordem estável", async () => {
  const conta = await novaConta();
  const outra = await novaConta();
  const variacao = await novaVariacao();
  const ids = [];
  for (let i = 0; i < 12; i++) {
    const pedido = await pedidoRegistrado(conta, variacao, {
      data: new Date("2026-01-01T12:00:00Z"),
      status: ["SOLICITADA", "CONCLUIDA", "CANCELADA", "PENDENTE"][i % 4],
      // Compras feitas diretamente na loja também pertencem ao histórico do cliente.
      ...(i === 0 ? { chavePedido: null, formaPagamento: "DINHEIRO" } : {}),
    });
    ids.unshift(pedido.id);
  }
  const alheio = await pedidoRegistrado(outra, variacao);
  const primeira = await request(`/auth/me/pedidos?clienteId=${outra.clienteId}`, { method: "GET", cookie: conta.cookie });
  assert.equal(primeira.status, 200);
  assert.equal(primeira.data.total, 12);
  assert.equal(primeira.data.totalPaginas, 2);
  assert.deepEqual(primeira.data.pedidos.map((p) => p.id), ids.slice(0, 10));
  assert.equal(primeira.data.pedidos.some((p) => p.id === alheio.id), false);
  const segunda = await request("/auth/me/pedidos?pagina=2", { method: "GET", cookie: conta.cookie });
  assert.deepEqual(segunda.data.pedidos.map((p) => p.id), ids.slice(10));
  assert.equal(segunda.data.pedidos[1].formaPagamento, "DINHEIRO");
  const inexistente = await request("/auth/me/pedidos?pagina=3", { method: "GET", cookie: conta.cookie });
  assert.deepEqual(inexistente.data.pedidos, []);
  for (const campo of ["chavePedido", "clienteId", "senhaHash", "cpf", "precoCusto", "fornecedorId"]) {
    assert.equal(JSON.stringify(primeira.data).includes(`"${campo}":`), false, campo);
  }
});

test("detalhes trazem preços registrados, variações, forma de pagamento e parcelas em ordem", async () => {
  const conta = await novaConta();
  const variacao = await novaVariacao();
  const pedido = await pedidoRegistrado(conta, variacao, {
    status: "CONCLUIDA",
    parcelas: { create: [
      { numero: 2, valor: "49.99", dataVencimento: new Date("2026-11-12T12:00:00Z"), status: "PENDENTE" },
      { numero: 1, valor: "49.99", dataVencimento: new Date("2026-10-12T12:00:00Z"), status: "PAGA" },
    ] },
  });
  await prisma.produto.update({ where: { id: variacao.produtoId }, data: { precoVenda: "79.90" } });
  const resposta = await request(`/auth/me/pedidos/${pedido.id}`, { method: "GET", cookie: conta.cookie });
  assert.equal(resposta.status, 200, JSON.stringify(resposta.data));
  const detalhe = resposta.data.pedido;
  assert.equal(detalhe.id, pedido.id);
  assert.equal(detalhe.formaPagamento, "CREDIARIO");
  assert.equal(Number(detalhe.valorTotal), 99.98);
  assert.equal(Number(detalhe.itens[0].precoUnitario), 49.99);
  assert.equal(detalhe.itens[0].variacao.cor, "Rosa");
  assert.equal(detalhe.itens[0].variacao.tamanho, "M");
  assert.equal(detalhe.itens[0].variacao.produto.nome, "Peça de teste");
  assert.deepEqual(detalhe.parcelas.map((p) => [p.numero, p.status, Number(p.valor)]), [[1, "PAGA", 49.99], [2, "PENDENTE", 49.99]]);
  for (const campo of ["chavePedido", "clienteId", "senhaHash", "cpf", "precoCusto", "fornecedorId"]) {
    assert.equal(JSON.stringify(detalhe).includes(`"${campo}":`), false, campo);
  }
  assert.equal(await estoque(variacao.id), 10);
  assert.equal(await limite(conta.clienteId), 500);
});

test("consulta recusa outra conta, IDs inválidos, sessão ausente ou expirada e páginas inválidas", async () => {
  const conta = await novaConta();
  const outra = await novaConta();
  const pedido = await pedidoRegistrado(conta, await novaVariacao(), { formaPagamento: "A_VISTA" });
  const caminho = `/auth/me/pedidos/${pedido.id}`;
  const vazio = await request("/auth/me/pedidos", { method: "GET", cookie: outra.cookie });
  assert.deepEqual(vazio.data, { pedidos: [], total: 0, pagina: 1, totalPaginas: 1 });
  assert.equal((await request("/auth/me/pedidos", { method: "GET" })).status, 401);
  assert.equal((await request(caminho, { method: "GET" })).status, 401);
  const proibido = await request(caminho, { method: "GET", cookie: outra.cookie });
  const inexistente = await request("/auth/me/pedidos/2147483647", { method: "GET", cookie: outra.cookie });
  assert.equal(proibido.status, 404);
  assert.deepEqual(proibido.data, inexistente.data);
  for (const id of ["0", "-1", "abc", "1.5", "2147483648"]) {
    assert.equal((await request(`/auth/me/pedidos/${id}`, { method: "GET", cookie: conta.cookie })).status, 400);
  }
  for (const pagina of ["0", "-1", "abc", "1.5", "1000000", "1&pagina=2"]) {
    assert.equal((await request(`/auth/me/pedidos?pagina=${pagina}`, { method: "GET", cookie: conta.cookie })).status, 400);
  }
  const proprio = await request(caminho, { method: "GET", cookie: conta.cookie });
  assert.equal(proprio.data.pedido.formaPagamento, "A_VISTA");
  assert.deepEqual(proprio.data.pedido.parcelas, []);
  await prisma.sessaoUsuario.updateMany({ where: { usuarioId: conta.id }, data: { expiraEm: new Date(0) } });
  assert.equal((await request(caminho, { method: "GET", cookie: conta.cookie })).status, 401);
});
