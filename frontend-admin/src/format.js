export function formatCurrencyInput(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const reais = (parseInt(digits, 10) / 100).toFixed(2);
  const [intPart, decPart] = reais.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart}`;
}

export function parseCurrencyInput(value) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
}
