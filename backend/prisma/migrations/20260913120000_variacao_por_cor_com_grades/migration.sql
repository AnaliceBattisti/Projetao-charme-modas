-- Separa a variação em dois níveis: Variacao passa a ser a COR (com a foto) e
-- a nova tabela Grade guarda o TAMANHO (com estoque e SKU). Como o estoque desce
-- para a grade, MovimentacaoEstoque e ItemCompra passam a referenciar Grade.
--
-- O backfill preserva os dados existentes: cada Variacao atual vira uma grade,
-- cores repetidas do mesmo produto são consolidadas numa variação só, e as FKs
-- são repontadas antes de qualquer coluna ser removida.

-- 1. Tabela de grades. A coluna temporária guarda de qual Variacao antiga a
--    grade veio, para repontar as FKs mais adiante.
CREATE TABLE "Grade" (
  "id" SERIAL NOT NULL,
  "variacaoId" INTEGER NOT NULL,
  "tamanho" TEXT NOT NULL,
  "sku" TEXT,
  "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
  "estoqueAtual" INTEGER NOT NULL DEFAULT 0,
  "variacaoOrigemId" INTEGER,
  CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- 2. Uma grade por variação existente, preservando tamanho, SKU e estoques.
INSERT INTO "Grade" ("variacaoId", "tamanho", "sku", "estoqueMinimo", "estoqueAtual", "variacaoOrigemId")
SELECT "id", COALESCE(NULLIF(TRIM("tamanho"), ''), 'Único'), "sku", "estoqueMinimo", "estoqueAtual", "id"
FROM "Variacao";

-- 3. Repontar MovimentacaoEstoque para a grade correspondente.
ALTER TABLE "MovimentacaoEstoque" ADD COLUMN "gradeId" INTEGER;
UPDATE "MovimentacaoEstoque" m
SET "gradeId" = g."id"
FROM "Grade" g
WHERE g."variacaoOrigemId" = m."variacaoId";

DELETE FROM "MovimentacaoEstoque" WHERE "gradeId" IS NULL;
ALTER TABLE "MovimentacaoEstoque" ALTER COLUMN "gradeId" SET NOT NULL;
ALTER TABLE "MovimentacaoEstoque" DROP CONSTRAINT IF EXISTS "MovimentacaoEstoque_variacaoId_fkey";
ALTER TABLE "MovimentacaoEstoque" DROP COLUMN "variacaoId";

-- 4. Repontar ItemCompra para a grade correspondente.
ALTER TABLE "ItemCompra" ADD COLUMN "gradeId" INTEGER;
UPDATE "ItemCompra" i
SET "gradeId" = g."id"
FROM "Grade" g
WHERE g."variacaoOrigemId" = i."variacaoId";

DELETE FROM "ItemCompra" WHERE "gradeId" IS NULL;
ALTER TABLE "ItemCompra" ALTER COLUMN "gradeId" SET NOT NULL;
ALTER TABLE "ItemCompra" DROP CONSTRAINT IF EXISTS "ItemCompra_variacaoId_fkey";
ALTER TABLE "ItemCompra" DROP COLUMN "variacaoId";

-- 5. Normalizar a cor antes de consolidar (era opcional, agora é a identidade).
UPDATE "Variacao" SET "cor" = COALESCE(NULLIF(TRIM("cor"), ''), 'Única');

-- 6. Consolidar cores repetidas do mesmo produto: a variação de menor id
--    sobrevive, herda as grades das irmãs e a primeira foto não nula.
UPDATE "Grade" g
SET "variacaoId" = sobrevivente."id"
FROM "Variacao" atual
JOIN LATERAL (
  SELECT MIN("id") AS "id"
  FROM "Variacao" irma
  WHERE irma."produtoId" = atual."produtoId" AND irma."cor" = atual."cor"
) sobrevivente ON TRUE
WHERE g."variacaoId" = atual."id" AND sobrevivente."id" <> atual."id";

UPDATE "Variacao" sobrevivente
SET "imagemUrl" = COALESCE(sobrevivente."imagemUrl", (
  SELECT irma."imagemUrl"
  FROM "Variacao" irma
  WHERE irma."produtoId" = sobrevivente."produtoId"
    AND irma."cor" = sobrevivente."cor"
    AND irma."imagemUrl" IS NOT NULL
  ORDER BY irma."id"
  LIMIT 1
));

DELETE FROM "Variacao" duplicada
WHERE EXISTS (
  SELECT 1 FROM "Variacao" irma
  WHERE irma."produtoId" = duplicada."produtoId"
    AND irma."cor" = duplicada."cor"
    AND irma."id" < duplicada."id"
);

-- 7. Variacao perde o que desceu para a grade e ganha a identidade por cor.
DROP INDEX IF EXISTS "Variacao_sku_key";
ALTER TABLE "Variacao" DROP COLUMN "tamanho";
ALTER TABLE "Variacao" DROP COLUMN "sku";
ALTER TABLE "Variacao" DROP COLUMN "estoqueMinimo";
ALTER TABLE "Variacao" DROP COLUMN "estoqueAtual";
ALTER TABLE "Variacao" ALTER COLUMN "cor" SET NOT NULL;

-- 8. Índices, unicidades e chaves estrangeiras do modelo novo.
ALTER TABLE "Grade" DROP COLUMN "variacaoOrigemId";

CREATE UNIQUE INDEX "Variacao_produtoId_cor_key" ON "Variacao"("produtoId", "cor");
CREATE UNIQUE INDEX "Grade_sku_key" ON "Grade"("sku");
CREATE UNIQUE INDEX "Grade_variacaoId_tamanho_key" ON "Grade"("variacaoId", "tamanho");
CREATE INDEX "Grade_variacaoId_idx" ON "Grade"("variacaoId");
CREATE INDEX "MovimentacaoEstoque_gradeId_idx" ON "MovimentacaoEstoque"("gradeId");
CREATE INDEX "ItemCompra_gradeId_idx" ON "ItemCompra"("gradeId");

ALTER TABLE "Grade" ADD CONSTRAINT "Grade_variacaoId_fkey"
  FOREIGN KEY ("variacaoId") REFERENCES "Variacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemCompra" ADD CONSTRAINT "ItemCompra_gradeId_fkey"
  FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
