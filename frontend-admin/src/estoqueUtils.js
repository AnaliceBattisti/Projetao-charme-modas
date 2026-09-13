// Recebe uma grade (tamanho): é nela que o estoque vive.
export function situacao(grade) {
  if (grade.estoqueAtual <= 0) return { label: "Esgotado", badge: "cm-badge-red" };
  if (grade.estoqueAtual <= grade.estoqueMinimo)
    return { label: "Estoque baixo", badge: "cm-badge-yellow" };
  return { label: "Adequado", badge: "cm-badge-green" };
}
