import { PrismaClient, StatusCrediario, StatusCompra, StatusParcela } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando limpeza e povoamento do banco de dados...');

  // 1. Limpeza em ordem reversa de dependência (desabilita FKs no Postgres para segurança)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Parcela", "ItemCompra", "Compra", "Crediario", "EnderecoCliente", "Cliente", "MovimentacaoEstoque", "Variacao", "Produto", "Fornecedor", "Usuario" RESTART IDENTITY CASCADE;`);

  // 2. Criar Usuário Admin
  await prisma.usuario.create({
    data: {
      nome: 'Admin Loja',
      email: 'admin@loja.com',
      senhaHash: '$2b$10$YourHashedPasswordHere',
      papel: 'ADMIN',
    },
  });

  // 3. Criar Fornecedor e Produto
  const fornecedor = await prisma.fornecedor.create({
    data: {
      nomeRazaoSocial: 'Confecções Nordeste LTDA',
      cnpj: '12345678000199',
      telefone: '(81) 98888-1111',
    },
  });

  const produto = await prisma.produto.create({
    data: {
      fornecedorId: fornecedor.id,
      nome: 'Calça Jeans Premium',
      precoCusto: 50.0,
      precoVenda: 100.0,
      variacoes: {
        create: [
          { cor: 'Azul', tamanho: '40', sku: 'CALCA-AZUL-40', estoqueAtual: 50 },
        ],
      },
    },
  });

  const variacao = await prisma.variacao.findFirstOrThrow({ where: { produtoId: produto.id } });

  // Datas de referência dinâmicas (com base em hoje)
  const hoje = new Date();
  
  const dataAtrasada = new Date();
  dataAtrasada.setDate(hoje.getDate() - 10); // Há 10 dias

  const dataEstaSemana = new Date();
  dataEstaSemana.setDate(hoje.getDate() + 3); // Em 3 dias

  const dataFutura = new Date();
  dataFutura.setDate(hoje.getDate() + 25); // Em 25 dias

  const ana = await prisma.cliente.create({
    data: {
      nome: 'Ana Maria',
      cpf: '111.111.111-11',
      telefone: '(81) 99999-0001',
      crediario: {
        create: {
          limiteCredito: 500.0,
          limiteDisponivel: 400.0,
          status: StatusCrediario.ATIVO,
        },
      },
    },
  });

  await prisma.compra.create({
    data: {
      clienteId: ana.id,
      valorTotal: 100.0,
      formaPagamento: 'CREDIARIO',
      status: StatusCompra.CONCLUIDA,
      itens: {
        create: [{ variacaoId: variacao.id, quantidade: 1, precoUnitario: 100.0 }],
      },
      parcelas: {
        create: [
          { numero: 1, valor: 50.0, dataVencimento: dataAtrasada, status: StatusParcela.PAGA },
          { numero: 2, valor: 50.0, dataVencimento: dataAtrasada, status: StatusParcela.PENDENTE }, // Deve vir como ATRASADA na rota
        ],
      },
    },
  });

  const joao = await prisma.cliente.create({
    data: {
      nome: 'João Pedro',
      cpf: '222.222.222-22',
      telefone: '(81) 99999-0002',
      crediario: {
        create: {
          limiteCredito: 1000.0,
          limiteDisponivel: 800.0,
          status: StatusCrediario.ATIVO,
        },
      },
    },
  });

  await prisma.compra.create({
    data: {
      clienteId: joao.id,
      valorTotal: 200.0,
      formaPagamento: 'CREDIARIO',
      status: StatusCompra.CONCLUIDA,
      itens: {
        create: [{ variacaoId: variacao.id, quantidade: 2, precoUnitario: 100.0 }],
      },
      parcelas: {
        create: [
          { numero: 1, valor: 100.0, dataVencimento: dataEstaSemana, status: StatusParcela.PENDENTE },
          { numero: 2, valor: 100.0, dataVencimento: dataFutura, status: StatusParcela.PENDENTE },
        ],
      },
    },
  });


  const carlos = await prisma.cliente.create({
    data: {
      nome: 'Carlos Eduardo',
      cpf: '333.333.333-33',
      telefone: '(81) 99999-0003',
      crediario: {
        create: {
          limiteCredito: 800.0,
          limiteDisponivel: 500.0,
          status: StatusCrediario.ATIVO,
        },
      },
    },
  });

  await prisma.compra.create({
    data: {
      clienteId: carlos.id,
      valorTotal: 150.0,
      formaPagamento: 'CREDIARIO',
      status: StatusCompra.CONCLUIDA,
      itens: {
        create: [{ variacaoId: variacao.id, quantidade: 1, precoUnitario: 150.0 }],
      },
      parcelas: {
        create: [
          { numero: 1, valor: 150.0, dataVencimento: dataFutura, status: StatusParcela.PENDENTE },
        ],
      },
    },
  });

  await prisma.compra.create({
    data: {
      clienteId: carlos.id,
      valorTotal: 150.0,
      formaPagamento: 'CREDIARIO',
      status: StatusCompra.CONCLUIDA,
      itens: {
        create: [{ variacaoId: variacao.id, quantidade: 1, precoUnitario: 150.0 }],
      },
      parcelas: {
        create: [
          { numero: 1, valor: 150.0, dataVencimento: dataAtrasada, status: StatusParcela.PENDENTE },
        ],
      },
    },
  });

  const maria = await prisma.cliente.create({
    data: {
      nome: 'Maria Souza',
      cpf: '444.444.444-44',
      telefone: '(81) 99999-0004',
      crediario: {
        create: {
          limiteCredito: 300.0,
          limiteDisponivel: 300.0,
          status: StatusCrediario.ATIVO,
        },
      },
    },
  });

  await prisma.compra.create({
    data: {
      clienteId: maria.id,
      valorTotal: 100.0,
      formaPagamento: 'CREDIARIO',
      status: StatusCompra.CONCLUIDA,
      itens: {
        create: [{ variacaoId: variacao.id, quantidade: 1, precoUnitario: 100.0 }],
      },
      parcelas: {
        create: [
          { numero: 1, valor: 100.0, dataVencimento: dataAtrasada, status: StatusParcela.PAGA },
        ],
      },
    },
  });

  console.log('✅ Seed executado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });