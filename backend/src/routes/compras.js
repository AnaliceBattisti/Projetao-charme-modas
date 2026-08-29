import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
  const compras = await prisma.compra.findMany({
    include: { cliente: true, itens: true, parcelas: true },
    orderBy: { data: "desc" },
  });
  res.json(compras);
});

router.get("/:id", async (req, res) => {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      cliente: true,
      itens: { include: { variacao: { include: { produto: true } } } },
      parcelas: true,
    },
  });
  if (!compra) return res.status(404).json({ error: "Compra não encontrada" });
  res.json(compra);
});

router.post("/", async (req, res) => {
  try {
    const { clienteId, formaPagamento, data = new Date().toISOString(), itens, numeroParcelas = 1 } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: "A compra deve conter pelo menos um item." });
    }

    const compra = await prisma.$transaction(async (tx) => {
      let valorTotalCalculado = 0;

      for (const item of itens) {
        const variacaoId = Number(item.variacaoId);
        const quantidade = Number(item.quantidade);
        const precoUnitario = Number(item.precoUnitario);

        const variacao = await tx.variacao.findUnique({
          where: { id: variacaoId }
        });

        if (!variacao) {
          throw new Error(`Variação de produto ID ${variacaoId} não encontrada.`);
        }

        if (variacao.estoqueAtual < quantidade) {
          throw new Error(`Estoque insuficiente para o item ID ${variacaoId}. Atual: ${variacao.estoqueAtual}, Solicitado: ${quantidade}`);
        }

        valorTotalCalculado += quantidade * precoUnitario;

        // Decrementa o estoque atual
        await tx.variacao.update({
          where: { id: variacaoId },
          data: {
            estoqueAtual: {
              decrement: quantidade
            }
          }
        });

        // Registra a movimentação no histórico
        await tx.movimentacaoEstoque.create({
          data: {
            variacaoId,
            tipo: "SAIDA",
            quantidade,
            motivo: `Venda no crediário`
          }
        });
      }

      const novaCompra = await tx.compra.create({
        data: {
          clienteId: Number(clienteId),
          valorTotal: valorTotalCalculado,
          formaPagamento: formaPagamento.toUpperCase(),
          data,
          itens: {
            create: itens.map((item) => ({
              variacaoId: Number(item.variacaoId),
              quantidade: Number(item.quantidade),
              precoUnitario: item.precoUnitario,
            })),
          },
        },
        include: { itens: true },
      });

      const eCrediario = formaPagamento.toUpperCase() === "CREDIARIO";

      if (eCrediario) {
        const valorParacreditar = valorTotalCalculado;

        // Busca o crediário do cliente para validar limite
        const crediario = await tx.crediario.findUnique({
          where: { clienteId: Number(clienteId) }
        });

        if (!crediario) {
          throw new Error("Cliente não possui conta de crediário cadastrada.");
        }

        if (crediario.status === "BLOQUEADO") {
          throw new Error("Crediário do cliente está bloqueado para novas compras.");
        }

        if (Number(crediario.limiteDisponivel) < valorParacreditar) {
          throw new Error(`Limite de crediário insuficiente. Disponível: R$ ${crediario.limiteDisponivel}`);
        }

        // Abate o valor do limite disponível
        await tx.crediario.update({
          where: { clienteId: Number(clienteId) },
          data: {
            limiteDisponivel: {
              decrement: valorParacreditar
            }
          }
        });

        // Gerar Parcelas do Carnê
        const parcelasCalculadas = gerarParcelasSeguras(valorParacreditar, Number(numeroParcelas));

        // Mapeia para o formato do banco de dados com as datas de vencimento
        const parcelasData = parcelasCalculadas.map((p) => {
          const dataVencimento = new Date();
          dataVencimento.setMonth(dataVencimento.getMonth() + p.numero);

          return {
            compraId: novaCompra.id,
            numero: p.numero,
            valor: p.valor,
            dataVencimento,
            status: "PENDENTE"
          };
        });

        await tx.parcela.createMany({
          data: parcelasData
        });
      }

      //Buscando novamente a compra pois as parcelas foram atualizadas 
      return tx.compra.findUnique({
        where: { id: novaCompra.id },
        include: {
          itens: true,
          parcelas: true
        }
      });
    });

    res.status(201).json(compra);
  } catch (error) {
    console.error("Erro no processamento da compra:", error.message);
    return res.status(400).json({ erro: error.message });
  }
});

//Alerta de Gambiara!
function gerarParcelasSeguras(valorTotalFinanciado, quantidadeParcelas) {
  // Converte o valor para centavos (inteiro) para evitar erros de ponto flutuante
  const totalCentavos = Math.round(Number(valorTotalFinanciado) * 100);

  const centavosPorParcela = Math.floor(totalCentavos / quantidadeParcelas);
  const restoCentavos = totalCentavos % quantidadeParcelas;

  const parcelas = [];

  for (let i = 1; i <= quantidadeParcelas; i++) {
    // Adiciona o resto dos centavos na primeira parcela (i === 1)
    const valorCentavos = (i === 1) ? (centavosPorParcela + restoCentavos) : centavosPorParcela;

    // Converte de volta para decimal/float com 2 casas
    const valorFinal = Number((valorCentavos / 100).toFixed(2));

    parcelas.push({
      numero: i,
      valor: valorFinal
    });
  }

  return parcelas;
}

export default router;
