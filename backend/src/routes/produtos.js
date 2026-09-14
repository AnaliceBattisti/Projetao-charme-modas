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
    include: { fornecedor: true, variacoes: { include: { grades: true } } },
    orderBy: { criadoEm: "desc" },
  });
  res.json(produtos);
});

router.get("/:id", async (req, res) => {
  const produto = await prisma.produto.findUnique({
    where: { id: Number(req.params.id) },
    include: { fornecedor: true, variacoes: { include: { grades: true } } },
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

// Variações do produto = as CORES. Os tamanhos ficam nas grades de cada cor.
router.post("/:id/variacoes", async (req, res) => {
  const { cor } = req.body;
  if (!cor?.trim()) {
    return res.status(400).json({ error: "Informe a cor da variação." });
  }
  const produtoId = Number(req.params.id);
  const jaExiste = await prisma.variacao.findFirst({
    where: { produtoId, cor: cor.trim() },
    select: { id: true },
  });
  if (jaExiste) {
    return res.status(409).json({ error: "Este produto já tem uma variação nessa cor." });
  }
  const variacao = await prisma.variacao.create({
    data: { cor: cor.trim(), produtoId },
    include: { grades: true },
  });
  res.status(201).json(variacao);
});

// A foto pertence à cor: vale para todos os tamanhos daquela variação.
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
      grades: {
        select: {
          estoqueAtual: true,
          _count: { select: { movimentacoesEstoque: true, itensCompra: true } },
        },
      },
    },
  });
  // A trava é agregada: basta um tamanho com estoque ou histórico para segurar a cor.
  const estoque = variacao.grades.reduce((total, g) => total + g.estoqueAtual, 0);
  if (estoque > 0) {
    return res.status(400).json({
      error: `Esta cor tem ${estoque} unidade(s) em estoque. Zere o estoque antes de remover.`,
    });
  }
  const temHistorico = variacao.grades.some(
    (g) => g._count.movimentacoesEstoque > 0 || g._count.itensCompra > 0
  );
  if (temHistorico) {
    return res.status(400).json({
      error: "Esta cor tem histórico de movimentações ou vendas e não pode ser removida.",
    });
  }
  // As grades saem junto pelo onDelete: Cascade.
  await prisma.variacao.delete({ where: { id: variacaoId } });
  res.status(204).send();
});

// Grades = os TAMANHOS de uma cor. É aqui que mora o estoque.
router.post("/:id/variacoes/:variacaoId/grades", async (req, res) => {
  const { tamanho, sku, estoqueMinimo } = req.body;
  if (!tamanho?.trim()) {
    return res.status(400).json({ error: "Informe o tamanho." });
  }
  const variacaoId = Number(req.params.variacaoId);
  const jaExiste = await prisma.grade.findFirst({
    where: { variacaoId, tamanho: tamanho.trim() },
    select: { id: true },
  });
  if (jaExiste) {
    return res.status(409).json({ error: "Essa cor já tem esse tamanho cadastrado." });
  }
  const grade = await prisma.grade.create({
    data: {
      variacaoId,
      tamanho: tamanho.trim(),
      sku: sku?.trim() || null,
      estoqueMinimo: Number(estoqueMinimo) || 0,
    },
  });
  res.status(201).json(grade);
});

router.put("/:id/variacoes/:variacaoId/grades/:gradeId", async (req, res) => {
  const { tamanho, sku, estoqueMinimo } = req.body;
  const grade = await prisma.grade.update({
    where: { id: Number(req.params.gradeId) },
    data: {
      ...(tamanho?.trim() ? { tamanho: tamanho.trim() } : {}),
      ...(sku !== undefined ? { sku: sku?.trim() || null } : {}),
      ...(estoqueMinimo !== undefined ? { estoqueMinimo: Number(estoqueMinimo) || 0 } : {}),
    },
  });
  res.json(grade);
});

router.delete("/:id/variacoes/:variacaoId/grades/:gradeId", async (req, res) => {
  const gradeId = Number(req.params.gradeId);
  const grade = await prisma.grade.findUniqueOrThrow({
    where: { id: gradeId },
    select: {
      estoqueAtual: true,
      _count: { select: { movimentacoesEstoque: true, itensCompra: true } },
    },
  });
  if (grade.estoqueAtual > 0) {
    return res.status(400).json({
      error: `Este tamanho tem ${grade.estoqueAtual} unidade(s) em estoque. Zere o estoque antes de remover.`,
    });
  }
  if (grade._count.movimentacoesEstoque > 0 || grade._count.itensCompra > 0) {
    return res.status(400).json({
      error: "Este tamanho tem histórico de movimentações ou vendas e não pode ser removido.",
    });
  }
  await prisma.grade.delete({ where: { id: gradeId } });
  res.status(204).send();
});

export default router;
