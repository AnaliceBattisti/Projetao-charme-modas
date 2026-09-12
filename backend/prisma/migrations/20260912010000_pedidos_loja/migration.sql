ALTER TYPE "StatusCompra" ADD VALUE 'SOLICITADA';
ALTER TABLE "Compra" ADD COLUMN "chavePedido" TEXT;
CREATE UNIQUE INDEX "Compra_chavePedido_key" ON "Compra"("chavePedido");
