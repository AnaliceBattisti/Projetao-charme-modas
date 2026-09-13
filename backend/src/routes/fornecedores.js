import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const fornecedores = await prisma.fornecedor.findMany({
    include: { _count: { select: { produtos: true } } },
  });
  res.json(fornecedores);
});

router.get("/:id", async (req, res) => {
  const fornecedor = await prisma.fornecedor.findUnique({
    where: { id: Number(req.params.id) },
    include: { produtos: true },
  });
  if (!fornecedor) return res.status(404).json({ error: "Fornecedor não encontrado" });
  res.json(fornecedor);
});

router.post("/", async (req, res) => {
  const fornecedor = await prisma.fornecedor.create({ data: req.body });
  res.status(201).json(fornecedor);
});

router.put("/:id", async (req, res) => {
  const fornecedor = await prisma.fornecedor.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(fornecedor);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  // Mesma ideia da trava de produto/variação: explicar o motivo em vez de deixar
  // o banco recusar a chave estrangeira.
  const { _count } = await prisma.fornecedor.findUniqueOrThrow({
    where: { id },
    select: { _count: { select: { produtos: true } } },
  });
  if (_count.produtos > 0) {
    return res.status(400).json({
      error: `Este fornecedor tem ${_count.produtos} produto(s) cadastrado(s). Remova ou troque o fornecedor desses produtos antes de excluir.`,
    });
  }
  await prisma.fornecedor.delete({ where: { id } });
  res.status(204).send();
});

export default router;
