ALTER TABLE "Cliente" ADD COLUMN "email" TEXT;

CREATE TABLE "EnderecoCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,

    CONSTRAINT "EnderecoCliente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnderecoCliente_clienteId_idx" ON "EnderecoCliente"("clienteId");

ALTER TABLE "EnderecoCliente" ADD CONSTRAINT "EnderecoCliente_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
