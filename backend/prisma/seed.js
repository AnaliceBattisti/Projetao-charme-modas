import { PrismaClient, StatusCrediario, StatusCompra, StatusParcela } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();

const aqui = path.dirname(fileURLToPath(import.meta.url));

/**
 * As fotos do seed ficam versionadas em prisma/seed-assets, porque uploads/ é
 * ignorado pelo git. Aqui elas são copiadas para uploads/ com nome fixo, para
 * todo mundo ver as mesmas imagens depois de rodar o seed.
 */
function publicarFoto(arquivo) {
  const origem = path.join(aqui, 'seed-assets', arquivo);
  const destino = path.join(process.cwd(), 'uploads', arquivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
  return `/uploads/${arquivo}`;
}

async function main() {
  console.log('🌱 Iniciando limpeza e povoamento do banco de dados...');

  // 1. Limpeza em ordem reversa de dependência (desabilita FKs no Postgres para segurança)
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Parcela", "ItemCompra", "Compra", "Crediario", "EnderecoCliente", "Cliente", "MovimentacaoEstoque", "Grade", "Variacao", "Produto", "Fornecedor", "Usuario" RESTART IDENTITY CASCADE;`);

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
          {
            cor: 'Azul',
            grades: {
              create: [
                { tamanho: '38', sku: 'CALCA-AZUL-38', estoqueAtual: 20 },
                { tamanho: '40', sku: 'CALCA-AZUL-40', estoqueAtual: 50 },
              ],
            },
          },
        ],
      },
    },
  });

  // Camiseta com duas cores e foto em cada uma: é o que mostra a variação por cor
  // funcionando na loja (trocar a cor troca a foto) e a cor esgotada riscada no card.
  await prisma.produto.create({
    data: {
      fornecedorId: fornecedor.id,
      nome: 'Camiseta Básica Gola V Masculina',
      categoria: 'Masculino',
      precoCusto: 40.0,
      precoVenda: 70.0,
      variacoes: {
        create: [
          {
            cor: 'Branca',
            imagemUrl: publicarFoto('camiseta-gola-v-branca.png'),
            grades: {
              create: [
                { tamanho: 'P', sku: 'CAM-GOLAV-BR-P', estoqueAtual: 4 },
                { tamanho: 'M', sku: 'CAM-GOLAV-BR-M', estoqueAtual: 5 },
                { tamanho: 'G', sku: 'CAM-GOLAV-BR-G', estoqueAtual: 0 },
              ],
            },
          },
          {
            // Sem estoque de propósito: a bolinha dessa cor aparece riscada na vitrine.
            cor: 'Verde',
            imagemUrl: publicarFoto('camiseta-gola-v-verde.png'),
            grades: {
              create: [
                { tamanho: 'P', sku: 'CAM-GOLAV-VD-P', estoqueAtual: 0 },
                { tamanho: 'M', sku: 'CAM-GOLAV-VD-M', estoqueAtual: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  const variacao = await prisma.variacao.findFirstOrThrow({ where: { produtoId: produto.id } });
  const grade = await prisma.grade.findFirstOrThrow({
    where: { variacaoId: variacao.id, tamanho: '40' },
  });

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
        create: [{ gradeId: grade.id, quantidade: 1, precoUnitario: 100.0 }],
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
        create: [{ gradeId: grade.id, quantidade: 2, precoUnitario: 100.0 }],
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
        create: [{ gradeId: grade.id, quantidade: 1, precoUnitario: 150.0 }],
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
        create: [{ gradeId: grade.id, quantidade: 1, precoUnitario: 150.0 }],
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
        create: [{ gradeId: grade.id, quantidade: 1, precoUnitario: 100.0 }],
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