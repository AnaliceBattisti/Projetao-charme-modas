import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

//TODO: Melhorar com Ts
const PARCELAS_ENUM = ['PENDENTE', 'PAGA','ATRASADA']

router.get("/", async (req, res) => {
    const params = req.query;

    if(params.status && !PARCELAS_ENUM.includes(params.status)){
      return res.status(400).json({ erro: `Status inválido, campo deve ser um dos possiveis: ${PARCELAS_ENUM.join(',')}` });
    }

    if(params.dataInicio && Number.isNaN(new Date(params.dataInicio).getTime())){
      return res.status(400).json({ erro: `dataInicio inválido, campo deve ser uma data válida` });
    }

    if(params.dataFim && Number.isNaN(new Date(params.dataFim).getTime())){
      return res.status(400).json({ erro: `dataFim inválido, campo deve ser uma data válida` });
    }

    const statusFilter = params.status ? { status: { equals: params.status } } : {};
    const dataInicioFilter = params.dataInicio ? { dataVencimento: { gte: new Date(params.dataInicio) } } : {};
    const dataFimFilter = params.dataFim ? { dataVencimento: { lte: new Date(params.dataFim) } } : {};

    const parcelas = await prisma.parcela.findMany({
        where: {
            ...statusFilter,
            ...dataInicioFilter,
            ...dataFimFilter
        },
        include: {
            compra: {
                select: {
                    id: true,
                    cliente: {
                        select: {
                            id: true,
                            nome: true,
                            cpf: true,
                            telefone: true
                        }
                    }
                }
            }
        },
        orderBy: { dataVencimento: 'asc' }
    })

    return res.json(parcelas);
});

router.put('/baixa/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const parcela = await prisma.parcela.findUnique({
      where: { id: Number(id) },
      include: {
        compra: {
          select: { clienteId: true }
        }
      }
    });

    if (!parcela) {
      return res.status(404).json({ erro: 'Parcela não encontrada.' });
    }

    if (parcela.status === 'PAGA') {
      return res.status(400).json({ erro: 'Esta parcela já foi paga.' });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const parcelaAtualizada = await tx.parcela.update({
        where: { id: Number(id) },
        data: { status: 'PAGA' }
      });

      const crediario = await prisma.crediario.findUnique({
        where: { clienteId: parcela.compra.clienteId },
      });

      const creditoRecompor = crediario.limiteDisponivel + parcela.valor > crediario.limiteCredito ? crediario.limiteCredito - crediario.limiteDisponivel : parcela.valor;

      await tx.crediario.update({
        where: { id: crediario.id },
        data: {
          limiteDisponivel: {
            increment: creditoRecompor
          }
        },
      });

      return parcelaAtualizada;
    });

    return res.json({
      mensagem: 'Pagamento registrado e limite atualizado com sucesso.',
      parcela: resultado
    });
  } catch (error) {
    console.error('Erro ao baixar parcela:', error);
    return res.status(500).json({ erro: 'Erro interno ao processar pagamento.' });
  }
});


export default router;