export const emptyCliente = { nome: "", cpf: "", idade: "", profissao: "", estadoCivil: "", telefone: "", email: "" };
export const emptyEndereco = { cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" };
export const estados = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function formatCpf(value = "") {
  return value.replace(/\D/g, "").slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatCep(value = "") {
  return value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatTelefone(value) {
  if (!value) return "Não informado";
  return value.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
}

export function formatTelefoneInput(value = "") {
  let digits = value.replace(/\D/g, "");
  // Aceita também números brasileiros colados com o código do país.
  if (!value.trimStart().startsWith("(") && /^55\d{10,11}$/.test(digits)) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const numero = digits.slice(2);
  const prefixo = numero.length > 8 ? 5 : 4;
  const sufixo = numero.length > prefixo ? `-${numero.slice(prefixo)}` : "";
  return `(${digits.slice(0, 2)}) ${numero.slice(0, prefixo)}${sufixo}`;
}

export const moeda = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
export const data = (value) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";
export const normalizarBusca = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const mensagemErro = (error) => error instanceof TypeError ? "Não foi possível conectar ao servidor. Verifique a conexão e tente novamente." : error.message;

export function situacaoCredito(crediario, atrasado = false) {
  if (!crediario) return { label: "Sem crediário", color: "muted" };
  if (crediario.status === "BLOQUEADO") return { label: "Bloqueado", color: "danger" };
  if (atrasado) return { label: "Atrasado", color: "danger" };
  if (Number(crediario.limiteDisponivel) < Number(crediario.limiteCredito)) return { label: "Em uso", color: "warning" };
  if (Number(crediario.limiteDisponivel) <= 0) return { label: "Sem limite", color: "muted" };
  return { label: "Disponível", color: "success" };
}

export function parcelaAtrasada(parcela) {
  return ["PENDENTE", "ATRASADA"].includes(parcela.status) && (parcela.status === "ATRASADA" || new Date(parcela.dataVencimento) < new Date());
}

export function resumirCompras(compras) {
  const resumo = new Map();
  for (const compra of compras) {
    const atual = resumo.get(compra.clienteId) || { quantidade: 0, ultima: null, atrasado: false };
    atual.quantidade++;
    if (!atual.ultima || new Date(compra.data) > new Date(atual.ultima)) atual.ultima = compra.data;
    atual.atrasado ||= compra.parcelas.some(parcelaAtrasada);
    resumo.set(compra.clienteId, atual);
  }
  return resumo;
}
