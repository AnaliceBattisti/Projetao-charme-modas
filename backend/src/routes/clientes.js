import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const clientes = await prisma.cliente.findMany({ include: { crediario: true } });
  res.json(clientes);
});

router.get("/:id", async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(req.params.id) },
    include: { crediario: true, compras: true },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado" });
  res.json(cliente);
});

router.post("/", async (req, res) => {
  const cliente = await prisma.cliente.create({ data: req.body });
  res.status(201).json(cliente);
});

router.put("/:id", async (req, res) => {
  const cliente = await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(cliente);
});

router.delete("/:id", async (req, res) => {
  await prisma.cliente.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

export default router;
