-- Padroniza o CNPJ já cadastrado: só dígitos, sem máscara.
-- Antes o formato dependia de quem cadastrou (formulário salvava "12.345.678/0001-99",
-- seed salvava "12345678000199"), e a busca por CNPJ falhava em um dos dois casos.
UPDATE "Fornecedor"
SET "cnpj" = regexp_replace("cnpj", '\D', '', 'g')
WHERE "cnpj" ~ '\D';
