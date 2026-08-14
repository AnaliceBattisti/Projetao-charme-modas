import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const crediarios = await prisma.crediario.findMany({ include: { cliente: true } });
  res.json(crediarios);
});

router.get("/cliente/:clienteId", async (req, res) => {
  const crediario = await prisma.crediario.findUnique({
    where: { clienteId: Number(req.params.clienteId) },
  });
  if (!crediario) return res.status(404).json({ error: "Cliente não possui crediário" });
  res.json(crediario);
});

router.post("/", async (req, res) => {
  const { clienteId, limiteCredito, status } = req.body;
  const crediario = await prisma.crediario.create({
    data: { clienteId: Number(clienteId), limiteCredito, status },
  });
  res.status(201).json(crediario);
});

// Atualizar limite de crédito ou bloquear/desbloquear cliente
router.put("/:id", async (req, res) => {
  const crediario = await prisma.crediario.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(crediario);
});

export default router;
