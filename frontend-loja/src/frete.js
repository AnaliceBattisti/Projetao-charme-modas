// Regra de frete da loja, num lugar só pra ser fácil de mudar.
// Não é cotação de transportadora: é a política da própria Charme Modas.
export const FRETE_PADRAO = 15;
export const FRETE_GRATIS_ACIMA_DE = 299;

export function calcularFrete(subtotal) {
  if (subtotal <= 0) return 0;
  return subtotal >= FRETE_GRATIS_ACIMA_DE ? 0 : FRETE_PADRAO;
}

/** Quanto falta para o frete sair de graça (0 quando já está grátis). */
export function faltaParaFreteGratis(subtotal) {
  return Math.max(FRETE_GRATIS_ACIMA_DE - subtotal, 0);
}
