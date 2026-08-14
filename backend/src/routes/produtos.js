import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const produtos = await prisma.produto.findMany({
    include: { fornecedor: true, variacoes: true },
  });
  res.json(produtos);
});

router.get("/:id", async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(req.params.id) },
    include: { fornecedor: true, variacoes: true },
  });
  if (!produto) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(produto);
});

router.post("/", async (req, res) => {
  const produto = await prisma.produto.create({ data: req.body });
  res.status(201).json(produto);
});

router.put("/:id", async (req, res) => {
  const produto = await prisma.produto.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(produto);
});

router.delete("/:id", async (req, res) => {
  await prisma.produto.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

// Variações do produto (cor/tamanho/SKU)
router.post("/:id/variacoes", async (req, res) => {
  const variacao = await prisma.variacao.create({
    data: { ...req.body, produtoId: Number(req.params.id) },
  });
  res.status(201).json(variacao);
});

export default router;
