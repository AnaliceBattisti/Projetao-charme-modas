-- AlterEnum
ALTER TYPE "TipoMovimentacaoEstoque" ADD VALUE 'AJUSTE';

-- AlterTable
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN     "motivo" TEXT;

-- AlterTable
ALTER TABLE "Variacao" ADD COLUMN     "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estoqueMinimo" INTEGER NOT NULL DEFAULT 0;
