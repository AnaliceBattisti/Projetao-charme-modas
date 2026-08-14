import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Histórico de movimentações (entrada/saída)
router.get("/", async (req, res) => {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    include: { variacao: { include: { produto: true } } },
    orderBy: { data: "desc" },
  });
  res.json(movimentacoes);
});

router.get("/variacao/:variacaoId", async (req, res) => {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: { variacaoId: Number(req.params.variacaoId) },
    orderBy: { data: "desc" },
  });
  res.json(movimentacoes);
});

// Registrar entrada (chegada de mercadoria) ou saída (ajuste manual/perda)
// A baixa automática de estoque ao confirmar uma venda fica na rota de compras.
router.post("/", async (req, res) => {
  const { variacaoId, tipo, quantidade } = req.body;
  const movimentacao = await prisma.movimentacaoEstoque.create({
    data: { variacaoId: Number(variacaoId), tipo, quantidade: Number(quantidade) },
  });
  res.status(201).json(movimentacao);
});

export default router;
