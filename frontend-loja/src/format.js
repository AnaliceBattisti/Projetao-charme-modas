const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarPreco(valor) {
  return moeda.format(Number(valor) || 0);
}

// A vitrine anuncia "até 3x sem juros"; o valor da parcela é só a divisão simples.
export function parcelaSemJuros(valor, vezes = 3) {
  return moeda.format((Number(valor) || 0) / vezes);
}

export function formatCpf(value = "") {
  return value.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatTelefoneInput(value = "") {
  let digits = value.replace(/\D/g, "");
  // Aceita também números brasileiros colados com o código do país.
  if (!value.trimStart().startsWith("(") && /^55\d{10,11}$/.test(digits)) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const numero = digits.slice(2);
  const prefixo = numero.length > 8 ? 5 : 4;
  const sufixo = numero.length > prefixo ? `-${numero.slice(prefixo)}` : "";
  return `(${digits.slice(0, 2)}) ${numero.slice(0, prefixo)}${sufixo}`;
}
