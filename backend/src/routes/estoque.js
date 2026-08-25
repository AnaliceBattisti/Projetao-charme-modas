import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Todas as variações com produto, pra montar a tabela de estoque (mínimo/atual/situação)
router.get("/", async (req, res) => {
  const variacoes = await prisma.variacao.findMany({
    include: { produto: true },
    orderBy: { id: "asc" },
  });
  res.json(variacoes);
});

// Histórico de movimentações (entrada/saída/ajuste)
router.get("/movimentacoes", async (req, res) => {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    include: { variacao: { include: { produto: true } } },
    orderBy: { data: "desc" },
    take: 50,
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

// Registrar entrada, saída ou ajuste manual — atualiza o estoqueAtual da variação
// na mesma transação pra nunca ficar dessincronizado do histórico.
router.post("/movimentacoes", async (req, res) => {
  const { variacaoId, tipo, quantidade, motivo } = req.body;
  const id = Number(variacaoId);
  const qtd = Number(quantidade);
  const delta = tipo === "SAIDA" ? -qtd : qtd;

  const [movimentacao] = await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: { variacaoId: id, tipo, quantidade: qtd, motivo },
    }),
    prisma.variacao.update({
      where: { id },
      data: { estoqueAtual: { increment: delta } },
    }),
  ]);

  res.status(201).json(movimentacao);
});

export default router;
