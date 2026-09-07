import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { ValidationError, cpfFormats, validateCliente, validateEndereco, validateId } from "../validation/clientes.js";

const router = Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const cadastro = { crediario: true, enderecos: { orderBy: { id: "asc" } } };
const historico = {
  orderBy: [{ data: "desc" }, { id: "desc" }],
  include: {
    itens: { include: { variacao: { include: { produto: true } } }, orderBy: { id: "asc" } },
    parcelas: { orderBy: { numero: "asc" } },
  },
};

for (const parameter of ["id", "enderecoId"]) {
  router.param(parameter, (req, res, next, value) => {
    try {
      req.params[parameter] = validateId(value);
      next();
    } catch (error) {
      next(error);
    }
  });
}

async function cpfExists(cpf, id) {
  // Também reconhece cadastros antigos que armazenaram a máscara do CPF.
  return prisma.cliente.findFirst({
    where: { cpf: { in: cpfFormats(cpf) }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
}

router.get("/", asyncRoute(async (req, res) => {
  const { busca } = req.query;
  if (busca !== undefined && (typeof busca !== "string" || busca.length > 150)) {
    throw new ValidationError("Busca deve ser um texto com no máximo 150 caracteres.");
  }
  const term = busca?.trim();
  const digits = term?.replace(/\D/g, "");
  const clientes = await prisma.cliente.findMany({
    where: term ? {
      OR: [
        { nome: { contains: term, mode: "insensitive" } },
        ...(digits && /^[\d.\s-]+$/.test(term) ? [
          { cpf: { contains: digits } },
          ...(digits.length === 11 ? [{ cpf: { in: cpfFormats(digits) } }] : []),
        ] : []),
      ],
    } : undefined,
    include: cadastro,
    orderBy: [{ nome: "asc" }, { id: "asc" }],
  });
  res.json(clientes);
}));

router.get("/:id", asyncRoute(async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    include: { ...cadastro, compras: historico },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json(cliente);
}));

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


router.get("/:id/compras", asyncRoute(async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    select: { compras: historico },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json(cliente.compras);
}));

router.post("/", asyncRoute(async (req, res) => {
  const data = validateCliente(req.body);
  if (await cpfExists(data.cpf)) {
    return res.status(409).json({ error: "Já existe um cliente cadastrado com este CPF." });
  }
  const cliente = await prisma.cliente.create({ data, include: cadastro });
  res.location(`/clientes/${cliente.id}`).status(201).json(cliente);
}));

router.put("/:id", asyncRoute(async (req, res) => {
  const data = validateCliente(req.body, { partial: true });
  const id = req.params.id;
  if (!await prisma.cliente.findUnique({ where: { id }, select: { id: true } })) {
    return res.status(404).json({ error: "Cliente não encontrado." });
  }
  if (data.cpf && await cpfExists(data.cpf, id)) {
    return res.status(409).json({ error: "Já existe um cliente cadastrado com este CPF." });
  }
  const cliente = await prisma.cliente.update({ where: { id }, data, include: cadastro });
  res.json(cliente);
}));

router.delete("/:id", asyncRoute(async (req, res) => {
  // As FKs impedem a exclusão mesmo se uma compra/crediário for criado concorrentemente.
  // Endereços pertencem ao cadastro e são removidos pelo ON DELETE CASCADE.
  await prisma.cliente.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

router.get("/:id/enderecos", asyncRoute(async (req, res) => {
  const cliente = await prisma.cliente.findUnique({
    where: { id: req.params.id },
    select: { enderecos: cadastro.enderecos },
  });
  if (!cliente) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json(cliente.enderecos);
}));

router.post("/:id/enderecos", asyncRoute(async (req, res) => {
  const data = validateEndereco(req.body);
  // O connect mantém a criação atômica e retorna P2025 se o cliente não existe.
  const endereco = await prisma.enderecoCliente.create({
    data: { ...data, cliente: { connect: { id: req.params.id } } },
  });
  res.status(201).json(endereco);
}));

router.put("/:id/enderecos/:enderecoId", asyncRoute(async (req, res) => {
  const endereco = await prisma.enderecoCliente.update({
    where: { id: req.params.enderecoId, clienteId: req.params.id },
    data: validateEndereco(req.body, { partial: true }),
  });
  res.json(endereco);
}));

router.delete("/:id/enderecos/:enderecoId", asyncRoute(async (req, res) => {
  await prisma.enderecoCliente.delete({
    where: { id: req.params.enderecoId, clienteId: req.params.id },
  });
  res.status(204).send();
}));

router.use((error, req, res, next) => {
  if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
  if (error.code === "P2002") {
    return res.status(409).json({ error: "Já existe um cliente cadastrado com este CPF." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Cliente ou endereço não encontrado." });
  }
  if (error.code === "P2003" && req.method === "DELETE") {
    return res.status(409).json({ error: "Cliente possui compras ou crediário vinculados e não pode ser excluído." });
  }
  next(error);
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
