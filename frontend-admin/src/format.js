export function formatCurrencyInput(value) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const reais = (parseInt(digits, 10) / 100).toFixed(2);
  const [intPart, decPart] = reais.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart}`;
}

// O CNPJ viaja só com dígitos e ganha máscara na hora de mostrar.
export function formatCnpj(value = "") {
  const digits = String(value).replace(/\D/g, "").slice(0, 14);
  if (digits.length > 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  if (digits.length > 8) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
  if (digits.length > 5) return digits.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
  if (digits.length > 2) return digits.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
  return digits;
}

export function somenteDigitos(value = "") {
  return String(value).replace(/\D/g, "");
}

export function parseCurrencyInput(value) {
  if (!value) return 0;
  return Number(value.replace(/\./g, "").replace(",", "."));
}
