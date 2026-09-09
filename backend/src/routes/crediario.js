import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/", async (req, res) => {
  const { busca } = req.query;
  const where = {};
  if (busca) {
    where.cliente = {
      OR: [
        { nome: { contains: busca, mode: "insensitive" } },
        { cpf: { contains: busca, mode: "insensitive" } },
      ],
    };
  }
  const crediarios = await prisma.crediario.findMany({ where, include: { cliente: true } });
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

router.post('/:id/bloqueio/:bloquear', async (req,res) => {
  const acao = req.params.bloquear.toLocaleLowerCase() === 'true' ? 'BLOQUEADO' : 'ATIVO';

  if (isNaN(req.params.id)) {
    return res.status(400).json({ erro: 'ID do cliente inválido.' });
  }

  try{
    await prisma.crediario.update({
      where: { id: Number(req.params.id) },
      data: {
        status: acao
      },
    });

    return res.status(200).json();
  }catch(error){
    return res.status(400).json({ erro: "Não foi possível bloquear crediário do usuário" });
  }
})

router.post('/:id/limite', async (req,res)=>{
  const id = Number(req.params.id);
  const body = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ erro: 'ID do crediário inválido.' });
  }

  if(!body.valorLimite || isNaN(Number(body.valorLimite))){
    return res.status(400).json({ erro: 'Novo valor de limite inválido, valor deve ser numérico.' });
  }

  if(!body.motivo || body.motivo === ''){
    return res.status(400).json({ erro: 'Motivo de mudança no limite é obrigatório' });
  }

  const {motivo, valorLimite} = body;

  try{
    const crediario = await prisma.$transaction(async (tx) => {
      const crediario = await tx.crediario.findUnique({
        where: { id }
      });

      if(!crediario){
        throw new Error("Crediario não encontrado.");
      }

      const limiteCreditoAtual = Number(crediario.limiteCredito);
      const limiteDisponivelAtual = Number(crediario.limiteDisponivel);

      const limiteEmUso = limiteCreditoAtual - limiteDisponivelAtual;

      const novoLimiteNum = Number(valorLimite);
      const novoLimiteDisponivel = novoLimiteNum - limiteEmUso;

      if (novoLimiteDisponivel < 0) {
        throw new Error(
          `Impossível alterar. O cliente possui R$ ${limiteEmUso.toFixed(2)} em uso. O novo limite total não pode ser menor do que a dívida atual.`
        );
      }

      await tx.crediario.update({
        where: { id },
        data: {
          limiteCredito: novoLimiteNum,
          limiteDisponivel: novoLimiteDisponivel
        },
      });

      await tx.historicoLimiteCrediarioCliente.create({
        data: {
          clienteId: crediario.clienteId,
          limiteAnterior: crediario.limiteCredito,
          limiteFinal: novoLimiteNum,
          motivo
        }
      });

      return tx.crediario.findUnique({
        where: { id }
      });
    })


    return res.status(200).json(crediario);
  }catch(error){
    return res.status(400).json({ erro: error.message ?? "Não foi possível alterar limite de crediário do usuário"});
  }
})

export default router;
