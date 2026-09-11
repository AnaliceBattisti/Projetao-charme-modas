CREATE TABLE "RecuperacaoSenha" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RecuperacaoSenha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecuperacaoSenha_usuarioId_key" ON "RecuperacaoSenha"("usuarioId");
CREATE UNIQUE INDEX "RecuperacaoSenha_tokenHash_key" ON "RecuperacaoSenha"("tokenHash");
CREATE INDEX "RecuperacaoSenha_expiraEm_idx" ON "RecuperacaoSenha"("expiraEm");
ALTER TABLE "RecuperacaoSenha" ADD CONSTRAINT "RecuperacaoSenha_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
