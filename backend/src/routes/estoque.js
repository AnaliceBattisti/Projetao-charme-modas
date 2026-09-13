import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// O estoque é por grade (tamanho dentro de uma cor), então cada linha da tela
// de estoque é uma grade, com a cor e o produto vindo por cima.
const comProduto = { variacao: { include: { produto: true } } };

router.get("/", async (req, res) => {
  const grades = await prisma.grade.findMany({
    include: comProduto,
    orderBy: { id: "asc" },
  });
  res.json(grades);
});

// Histórico de movimentações (entrada/saída/ajuste)
router.get("/movimentacoes", async (req, res) => {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    include: { grade: { include: comProduto } },
    orderBy: { data: "desc" },
    take: 50,
  });
  res.json(movimentacoes);
});

router.get("/grade/:gradeId", async (req, res) => {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: { gradeId: Number(req.params.gradeId) },
    orderBy: { data: "desc" },
  });
  res.json(movimentacoes);
});

// Registrar entrada, saída ou ajuste manual — atualiza o estoqueAtual da grade
// na mesma transação pra nunca ficar dessincronizado do histórico.
router.post("/movimentacoes", async (req, res) => {
  const { gradeId, tipo, quantidade, motivo } = req.body;
  const id = Number(gradeId);
  const qtd = Number(quantidade);
  const delta = tipo === "SAIDA" ? -qtd : qtd;

  const [movimentacao] = await prisma.$transaction([
    prisma.movimentacaoEstoque.create({
      data: { gradeId: id, tipo, quantidade: qtd, motivo },
    }),
    prisma.grade.update({
      where: { id },
      data: { estoqueAtual: { increment: delta } },
    }),
  ]);

  res.status(201).json(movimentacao);
});

export default router;
