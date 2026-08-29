-- CreateTable
CREATE TABLE "HistoricoLimiteCrediarioCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "limiteAnterior" DECIMAL(10,2) NOT NULL,
    "limiteFinal" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoLimiteCrediarioCliente_pkey" PRIMARY KEY ("id")
);
