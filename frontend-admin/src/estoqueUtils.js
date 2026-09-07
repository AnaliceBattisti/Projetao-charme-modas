export function situacao(variacao) {
  if (variacao.estoqueAtual <= 0) return { label: "Esgotado", badge: "cm-badge-red" };
  if (variacao.estoqueAtual <= variacao.estoqueMinimo)
    return { label: "Estoque baixo", badge: "cm-badge-yellow" };
  return { label: "Adequado", badge: "cm-badge-green" };
}
