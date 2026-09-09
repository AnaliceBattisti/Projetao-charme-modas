-- Relação opcional preserva clientes e usuários internos já cadastrados.
ALTER TABLE "Usuario" ADD COLUMN "clienteId" INTEGER;
ALTER TABLE "Usuario" ALTER COLUMN "papel" SET DEFAULT 'CLIENTE';
CREATE UNIQUE INDEX "Usuario_clienteId_key" ON "Usuario"("clienteId");
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SessaoUsuario" (
  "id" SERIAL NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiraEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SessaoUsuario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessaoUsuario_tokenHash_key" ON "SessaoUsuario"("tokenHash");
CREATE INDEX "SessaoUsuario_usuarioId_idx" ON "SessaoUsuario"("usuarioId");
CREATE INDEX "SessaoUsuario_expiraEm_idx" ON "SessaoUsuario"("expiraEm");
ALTER TABLE "SessaoUsuario" ADD CONSTRAINT "SessaoUsuario_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
