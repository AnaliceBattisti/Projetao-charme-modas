import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const compras = await prisma.compra.findMany({
    include: { cliente: true, itens: true, parcelas: true },
    orderBy: { data: "desc" },
  });
  res.json(compras);
});

router.get("/:id", async (req, res) => {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      cliente: true,
      itens: { include: { variacao: { include: { produto: true } } } },
      parcelas: true,
    },
  });
  if (!compra) return res.status(404).json({ error: "Compra não encontrada" });
  res.json(compra);
});

// Cria a compra e os itens numa única transação.
// TODO (responsável pelo crediário/compras): dentro desta mesma transação,
// ainda falta dar baixa no estoque (MovimentacaoEstoque tipo SAIDA por item)
// e, se formaPagamento for "crediário", gerar as Parcelas de acordo com o
// limite de crédito do cliente.
router.post("/", async (req, res) => {
  const { clienteId, valorTotal, formaPagamento, itens } = req.body;

  const compra = await prisma.$transaction(async (tx) => {
    const novaCompra = await tx.compra.create({
      data: {
        clienteId: Number(clienteId),
        valorTotal,
        formaPagamento,
        itens: {
          create: itens.map((item) => ({
            variacaoId: Number(item.variacaoId),
            quantidade: Number(item.quantidade),
            precoUnitario: item.precoUnitario,
          })),
        },
      },
      include: { itens: true },
    });

    return novaCompra;
  });

  res.status(201).json(compra);
});

export default router;
