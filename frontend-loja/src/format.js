const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor) {
  return moeda.format(Number(valor) || 0);
}

// A vitrine anuncia "até 3x sem juros"; o valor da parcela é só a divisão simples.
export function parcelaSemJuros(valor, vezes = 3) {
  return moeda.format((Number(valor) || 0) / vezes);
}
