import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(process.cwd(), "uploads"),
    filename: (req, file, cb) => {
      const nomeUnico = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, nomeUnico);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Envie um arquivo de imagem."));
    }
    cb(null, true);
  },
});

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
  const id = Number(req.params.id);
  const { _count } = await prisma.produto.findUniqueOrThrow({
    where: { id },
    select: { _count: { select: { variacoes: true } } },
  });
  if (_count.variacoes > 0) {
    return res.status(400).json({
      error: "Este produto tem variações cadastradas. Remova as variações antes de excluir o produto.",
    });
  }
  await prisma.produto.delete({ where: { id } });
  res.status(204).send();
});

// Variações do produto (cor/tamanho/SKU)
router.post("/:id/variacoes", async (req, res) => {
  const { cor, tamanho, sku } = req.body;
  if (!cor?.trim() || !tamanho?.trim()) {
    return res.status(400).json({ error: "Preencha cor e tamanho." });
  }
  const variacao = await prisma.variacao.create({
    data: { cor, tamanho, sku: sku?.trim() || null, produtoId: Number(req.params.id) },
  });
  res.status(201).json(variacao);
});

// Foto da variação (cor+tamanho) — enviada depois da variação já criada (multipart/form-data, campo "imagem")
router.post("/:id/variacoes/:variacaoId/imagem", upload.single("imagem"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhuma imagem enviada." });
  const variacao = await prisma.variacao.update({
    where: { id: Number(req.params.variacaoId) },
    data: { imagemUrl: `/uploads/${req.file.filename}` },
  });
  res.json(variacao);
});

router.delete("/:id/variacoes/:variacaoId", async (req, res) => {
  const variacaoId = Number(req.params.variacaoId);
  const variacao = await prisma.variacao.findUniqueOrThrow({
    where: { id: variacaoId },
    select: {
      estoqueAtual: true,
      _count: { select: { movimentacoesEstoque: true, itensCompra: true } },
    },
  });
  if (variacao.estoqueAtual > 0) {
    return res.status(400).json({
      error: `Esta variação tem ${variacao.estoqueAtual} unidade(s) em estoque. Zere o estoque antes de remover.`,
    });
  }
  if (variacao._count.movimentacoesEstoque > 0 || variacao._count.itensCompra > 0) {
    return res.status(400).json({
      error: "Esta variação tem histórico de movimentações ou vendas e não pode ser removida.",
    });
  }
  await prisma.variacao.delete({ where: { id: variacaoId } });
  res.status(204).send();
});

export default router;
