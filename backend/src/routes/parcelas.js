import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
    const ateDias = Number(req.query.dias);
    const hoje = new Date();

    if(ateDias && Number.isNaN(ateDias)){
      return res.status(400).json({ erro: `ateDias inválido, campo deve ser uma data válida` });
    }

    const ateDate = new Date()
    ateDate.setDate(hoje.getDate()+( ateDias || 30))

    const comprasComPendencias = await prisma.compra.findMany({
        where: {
          parcelas:{
            some: {
              status: { notIn: ['PAGA','CANCELADA'] },
              dataVencimento: { lte: ateDate}
            }
          }
        },
        include: {
          _count: {
            select: {
              parcelas: true
            }
          },
          cliente: {
            select: {
              id: true,
              nome: true,
              cpf: true,
              telefone: true
            }
          },
          parcelas: {
            where: {
              status: { not: 'PAGA' },
              dataVencimento: { lte: ateDate }
            },
            orderBy: {
              numero: 'asc'
            }
          }
        },
        orderBy: { data: 'desc' }
    })

    let totalAReceber = 0;
    let totalEmAtraso = 0;
    let totalAVencer = 0;
    const clientesUnicosIds = new Set();

    const ultimasParcelasPendentes = comprasComPendencias.map((compra) => {
      const proximaParcela = compra.parcelas[0];
      const valorNum = Number(proximaParcela.valor);
      const dataVenc = new Date(proximaParcela.dataVencimento);

      let statusCalculado = proximaParcela.status;

      totalAReceber += valorNum;

      if (dataVenc < hoje) {
        statusCalculado = 'ATRASADA';
        totalEmAtraso += valorNum;
      }else{
        totalAVencer += valorNum;
      }

      clientesUnicosIds.add(compra.cliente.id);

      return {
        compraId: compra.id,
        dataCompra: compra.data,
        formaPagamento: compra.formaPagamento,
        cliente: compra.cliente,
        parcela: {
          id: proximaParcela.id,
          numero: proximaParcela.numero,
          totalParcelas: compra._count.parcelas,
          valor: valorNum,
          dataVencimento: proximaParcela.dataVencimento,
          status: statusCalculado
        }
      };
    });

    return res.json({
      resumo: {
        totalAReceber: Number(totalAReceber.toFixed(2)),
        totalAVencer: Number(totalAVencer.toFixed(2)),
        totalEmAtraso: Number(totalEmAtraso.toFixed(2)),
        totalRegistros: ultimasParcelasPendentes.length,
        totalClientesUnicos: clientesUnicosIds.size
      },
      dados: ultimasParcelasPendentes
    });
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