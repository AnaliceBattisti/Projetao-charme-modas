import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ValidationError } from "../validation/clientes.js";

const incluirItens = {
  itens: { include: { variacao: { select: { cor: true, tamanho: true, produto: { select: { nome: true } } } } } },
};
const invalid = (message) => { throw new ValidationError(message); };
const inteiro = (value, max) => Number.isInteger(value) && value > 0 && value <= max;

const resumoPedido = {
  id: true, data: true, status: true, formaPagamento: true, valorTotal: true,
};

export async function listarPedidos(clienteId, pagina = 1) {
  const porPagina = 10;
  const where = { clienteId };
  const [total, pedidos] = await prisma.$transaction([
    prisma.compra.count({ where }),
    prisma.compra.findMany({
      where, orderBy: [{ data: "desc" }, { id: "desc" }],
      take: porPagina, skip: (pagina - 1) * porPagina,
      select: {
        ...resumoPedido,
        itens: { orderBy: { id: "asc" }, select: { quantidade: true, variacao: { select: { produto: { select: { nome: true } } } } } },
      },
    }),
  ]);
  return { pedidos, total, pagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
}

export function consultarPedido(clienteId, id) {
  return prisma.compra.findFirst({
    where: { id, clienteId },
    select: {
      ...resumoPedido,
      itens: {
        orderBy: { id: "asc" },
        select: {
          id: true, quantidade: true, precoUnitario: true,
          variacao: { select: { cor: true, tamanho: true, imagemUrl: true, produto: { select: { id: true, nome: true } } } },
        },
      },
      parcelas: { orderBy: { numero: "asc" }, select: { numero: true, valor: true, dataVencimento: true, status: true } },
    },
  });
}

function validarPedido(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
    Object.keys(body).some((key) => !["chavePedido", "formaPagamento", "itens"].includes(key))) {
    invalid("Envie apenas os itens e a opção de pagamento do pedido.");
  }
  if (typeof body.chavePedido !== "string" || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(body.chavePedido)) {
    invalid("Identificação do pedido inválida. Atualize a página e tente novamente.");
  }
  if (!["CREDIARIO", "A_VISTA"].includes(body.formaPagamento)) {
    invalid("Escolha crediário ou à vista em contato com a loja.");
  }
  if (!Array.isArray(body.itens) || !body.itens.length || body.itens.length > 50) {
    invalid("O pedido deve conter de 1 a 50 itens.");
  }
  const ids = new Set();
  for (const item of body.itens) {
    if (!item || typeof item !== "object" || Array.isArray(item) ||
      Object.keys(item).some((key) => !["variacaoId", "quantidade"].includes(key)) ||
      !inteiro(item.variacaoId, 2147483647) || !inteiro(item.quantidade, 99) || ids.has(item.variacaoId)) {
      invalid("Informe produtos distintos e quantidades inteiras entre 1 e 99.");
    }
    ids.add(item.variacaoId);
  }
  return body;
}

function conferirReenvio(pedido, clienteId, dados) {
  if (pedido.clienteId !== clienteId || pedido.formaPagamento !== dados.formaPagamento ||
    pedido.itens.length !== dados.itens.length || dados.itens.some((item) =>
      !pedido.itens.some((salvo) => salvo.variacaoId === item.variacaoId && salvo.quantidade === item.quantidade))) {
    invalid("A identificação já pertence a outro pedido. Atualize a página e tente novamente.");
  }
  return pedido;
}

export async function enviarPedido(clienteId, body) {
  const dados = validarPedido(body);
  const existente = await prisma.compra.findUnique({ where: { chavePedido: dados.chavePedido }, include: incluirItens });
  if (existente) return conferirReenvio(existente, clienteId, dados);

  try {
    return await prisma.$transaction(async (tx) => {
      const variacoes = await tx.variacao.findMany({
        where: { id: { in: dados.itens.map((item) => item.variacaoId) } },
        include: { produto: true },
      });
      let valorTotal = new Prisma.Decimal(0);
      const itens = dados.itens.map((item) => {
        const variacao = variacoes.find((v) => v.id === item.variacaoId);
        if (!variacao) invalid("Um produto não está mais disponível. Revise seu carrinho.");
        if (variacao.estoqueAtual < item.quantidade) invalid(`Quantidade indisponível para ${variacao.produto.nome}. Revise seu carrinho.`);
        const precoUnitario = variacao.produto.precoVenda;
        if (precoUnitario.lte(0)) invalid("Um produto está sem preço disponível. Fale com a loja.");
        valorTotal = valorTotal.plus(precoUnitario.times(item.quantidade));
        return { variacaoId: item.variacaoId, quantidade: item.quantidade, precoUnitario };
      });
      if (valorTotal.gt("99999999.99")) invalid("O valor do pedido excede o permitido. Fale com a loja.");
      // A solicitação não reserva estoque, não consome limite e não gera cobrança.
      return tx.compra.create({
        data: {
          clienteId, chavePedido: dados.chavePedido, formaPagamento: dados.formaPagamento,
          status: "SOLICITADA", valorTotal, itens: { create: itens },
        },
        include: incluirItens,
      });
    });
  } catch (error) {
    if (error.code === "P2002") {
      const salvo = await prisma.compra.findUnique({ where: { chavePedido: dados.chavePedido }, include: incluirItens });
      if (salvo) return conferirReenvio(salvo, clienteId, dados);
    }
    throw error;
  }
}

export async function aprovarPedido(id, body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "numeroParcelas")) invalid("Informe apenas o número de parcelas.");
  const numeroParcelas = body.numeroParcelas ?? 1;
  if (!inteiro(numeroParcelas, 6)) invalid("Escolha de 1 a 6 parcelas.");

  return prisma.$transaction(async (tx) => {
    // A troca condicional de status impede aprovar/cancelar o mesmo pedido duas vezes.
    const alterado = await tx.compra.updateMany({ where: { id, status: "SOLICITADA" }, data: { status: "CONCLUIDA" } });
    if (!alterado.count) invalid("Pedido não encontrado ou já analisado pela loja.");
    const pedido = await tx.compra.findUnique({ where: { id }, include: { itens: true } });
    if (!["CREDIARIO", "A_VISTA"].includes(pedido.formaPagamento)) invalid("Opção do pedido inválida.");
    if (pedido.formaPagamento === "A_VISTA" && numeroParcelas !== 1) invalid("O pedido à vista não possui parcelas.");

    for (const item of [...pedido.itens].sort((a, b) => a.variacaoId - b.variacaoId)) {
      const estoque = await tx.variacao.updateMany({
        where: { id: item.variacaoId, estoqueAtual: { gte: item.quantidade } },
        data: { estoqueAtual: { decrement: item.quantidade } },
      });
      if (!estoque.count) invalid("Estoque insuficiente para aprovar o pedido.");
      await tx.movimentacaoEstoque.create({
        data: { variacaoId: item.variacaoId, quantidade: item.quantidade, tipo: "SAIDA", motivo: `Pedido da loja #${pedido.id} aprovado` },
      });
    }

    if (pedido.formaPagamento === "CREDIARIO") {
      const credito = await tx.crediario.updateMany({
        where: { clienteId: pedido.clienteId, status: "ATIVO", limiteDisponivel: { gte: pedido.valorTotal } },
        data: { limiteDisponivel: { decrement: pedido.valorTotal } },
      });
      if (!credito.count) invalid("O cliente precisa de crediário ativo e limite suficiente para aprovar o pedido.");
      const centavos = pedido.valorTotal.times(100).toNumber();
      const base = Math.floor(centavos / numeroParcelas);
      if (base < 1) invalid("O valor do pedido é insuficiente para essa quantidade de parcelas.");
      const hoje = new Date();
      const parcelas = Array.from({ length: numeroParcelas }, (_, index) => {
        const numero = index + 1;
        const vencimento = new Date(hoje.getFullYear(), hoje.getMonth() + numero, 1, 12);
        const ultimoDia = new Date(vencimento.getFullYear(), vencimento.getMonth() + 1, 0).getDate();
        vencimento.setDate(Math.min(hoje.getDate(), ultimoDia));
        return {
          compraId: id, numero, valor: (base + (index === 0 ? centavos % numeroParcelas : 0)) / 100,
          dataVencimento: vencimento, status: "PENDENTE",
        };
      });
      await tx.parcela.createMany({ data: parcelas });
    }
    return tx.compra.findUnique({ where: { id }, include: { ...incluirItens, parcelas: true } });
  });
}
