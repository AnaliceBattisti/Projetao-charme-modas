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
  const exposicaoCreditoCrediario = Number(process.env.EXPOSICAO_CREDITO_CREDIARIO) || 0;

  const cliente = await prisma.cliente.create({ 
    data: {
      ...req.body,
      compras: {
        create: []
      },
      crediario: {
        create: {
          limiteCredito: exposicaoCreditoCrediario,
          limiteDisponivel: exposicaoCreditoCrediario
        }
      }
    },
    include:{
      crediario: true
    }
  });
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

router.get('/:id/debitos', async (req, res) => {
  try {
    const clienteId = Number(req.params.id);
    const ateDias = Number(req.query.dias);
    const hoje = new Date();

    if (isNaN(clienteId)) {
      return res.status(400).json({ erro: 'ID do cliente inválido.' });
    }

    if(ateDias && Number.isNaN(ateDias)){
      return res.status(400).json({ erro: `ateDias inválido, campo deve ser uma data válida` });
    }

    const ateDate = new Date()
    ateDate.setDate(hoje.getDate()+( ateDias || 30))

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        compras: {
          select: {
            id: true,
            data: true,
            valorTotal: true,
            formaPagamento: true,
            parcelas: {
              where: {
                dataVencimento: { lte: ateDate}
              },
              orderBy: { numero: 'asc' }
            }
          },
          orderBy: { data: 'desc' }
        }
      }
    });

    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    let totalPendente = 0;
    let totalAtrasado = 0;
    let totalPago = 0;
    let qtdParcelasAtrasadas = 0;

   cliente.compras.map((compra) => {
      compra.parcelas.map((parcela) => {
        const valorNum = Number(parcela.valor);
        let statusCalculado = parcela.status;

        if (parcela.status !== 'PAGA' && new Date(parcela.dataVencimento) < hoje) {
          statusCalculado = 'ATRASADA';
        }

        if (statusCalculado === 'PAGA') {
          totalPago += valorNum;
        } else if (statusCalculado === 'ATRASADA') {
          totalAtrasado += valorNum;
          qtdParcelasAtrasadas += 1;
        } else {
          totalPendente += valorNum;
        }
      });
    });

    return res.json({
        totalPendente: Number(totalPendente.toFixed(2)),
        totalAtraso: Number(totalAtrasado.toFixed(2)),
        totalPago: Number(totalPago.toFixed(2)),
        qtdParcelasAtrasadas,
    });

  } catch (error) {
    console.error('Erro ao buscar débitos do cliente:', error);
    return res.status(500).json({ erro: 'Erro interno ao consultar débitos.' });
  }
});

export default router;
