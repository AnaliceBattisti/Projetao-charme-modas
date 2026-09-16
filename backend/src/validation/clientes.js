export class ValidationError extends Error {}

function invalid(message) {
  throw new ValidationError(message);
}

function objectBody(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    invalid("Envie um objeto JSON com os dados do cadastro.");
  }
  const unknown = Object.keys(body).filter((field) => !fields.includes(field));
  if (unknown.length) invalid(`Campos não permitidos: ${unknown.join(", ")}.`);
  if (!Object.keys(body).length) invalid("Informe pelo menos um campo para salvar.");
}

function text(value, label, { required = false, max = 150 } = {}) {
  if (value == null && !required) return null;
  if (typeof value !== "string") invalid(`${label} deve ser um texto.`);
  const result = value.trim();
  if (required && !result) invalid(`${label} é obrigatório.`);
  if (result.length > max) invalid(`${label} deve ter no máximo ${max} caracteres.`);
  return result || null;
}

export function validateId(value) {
  if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    invalid("O ID deve ser um número inteiro positivo válido.");
  }
  return Number(value);
}

export function normalizeCpf(value) {
  if (typeof value !== "string" || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value.trim())) {
    invalid("Informe um CPF válido, com 11 dígitos ou no formato 000.000.000-00.");
  }
  const cpf = value.replace(/\D/g, "");
  if (/^(\d)\1{10}$/.test(cpf)) invalid("CPF inválido.");
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    const digit = remainder === 10 ? 0 : remainder;
    if (digit !== Number(cpf[length])) invalid("CPF inválido.");
  }
  return cpf;
}

export function cpfFormats(cpf) {
  return [cpf, cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")];
}

function phone(value) {
  const input = text(value, "Telefone", { max: 30 });
  if (input === null) return null;
  if (!/^[\d\s()+-]+$/.test(input)) invalid("Telefone inválido.");
  let digits = input.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) digits = digits.slice(2);
  if (!/^[1-9]{2}\d{8,9}$/.test(digits)) {
    invalid("Informe um telefone com DDD e 10 ou 11 dígitos, opcionalmente com +55.");
  }
  return digits;
}

const addressFields = ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "estado"];
const states = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));

export function validateEndereco(body, { partial = false } = {}) {
  objectBody(body, addressFields);
  const data = {};
  for (const field of ["logradouro", "numero", "bairro", "cidade"]) {
    if (!partial || Object.hasOwn(body, field)) {
      data[field] = text(body[field], field, { required: true, max: field === "numero" ? 20 : 150 });
    }
  }
  if (Object.hasOwn(body, "complemento")) data.complemento = text(body.complemento, "Complemento");
  if (!partial || Object.hasOwn(body, "cep")) {
    if (typeof body.cep !== "string" || !/^\d{5}-?\d{3}$/.test(body.cep.trim())) {
      invalid("Informe um CEP com 8 dígitos ou no formato 00000-000.");
    }
    data.cep = body.cep.replace(/\D/g, "");
  }
  if (!partial || Object.hasOwn(body, "estado")) {
    const state = text(body.estado, "Estado", { required: true, max: 2 }).toUpperCase();
    if (!states.has(state)) invalid("Informe uma UF brasileira válida, como PE.");
    data.estado = state;
  }
  return data;
}

export function validateCliente(body, { partial = false } = {}) {
  const fields = ["nome", "cpf", "idade", "profissao", "estadoCivil", "telefone", "email"];
  if (!partial) fields.push("enderecos");
  objectBody(body, fields);
  const data = {};
  if (!partial || Object.hasOwn(body, "nome")) data.nome = text(body.nome, "Nome", { required: true });
  if (!partial || Object.hasOwn(body, "cpf")) data.cpf = normalizeCpf(body.cpf);
  if (Object.hasOwn(body, "idade")) {
    if (body.idade !== null && (!Number.isInteger(body.idade) || body.idade < 0 || body.idade > 130)) {
      invalid("Idade deve ser um número inteiro entre 0 e 130 ou null.");
    }
    data.idade = body.idade;
  }
  for (const field of ["profissao", "estadoCivil"]) {
    if (Object.hasOwn(body, field)) data[field] = text(body[field], field);
  }
  if (Object.hasOwn(body, "telefone")) data.telefone = phone(body.telefone);
  if (Object.hasOwn(body, "email")) {
    const email = text(body.email, "E-mail", { max: 254 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid("Informe um e-mail válido.");
    data.email = email?.toLowerCase() ?? null;
  }
  if (Object.hasOwn(body, "enderecos")) {
    if (!Array.isArray(body.enderecos) || body.enderecos.length > 20) {
      invalid("Endereços deve ser uma lista com no máximo 20 endereços por cadastro.");
    }
    data.enderecos = { create: body.enderecos.map((endereco) => validateEndereco(endereco)) };
  }
  return data;
}

export function validateUsuario(body, { partial = false } = {}) {
  const fields = ["nome", "cpf", "email"];
  objectBody(body, fields);
  const data = {};
  if (!partial || Object.hasOwn(body, "nome")) data.nome = text(body.nome, "Nome", { required: true });
  if (!partial || Object.hasOwn(body, "cpf")) data.cpf = normalizeCpf(body.cpf);
  if (Object.hasOwn(body, "email")) {
    const email = text(body.email, "E-mail", { max: 254 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid("Informe um e-mail válido.");
    data.email = email?.toLowerCase() ?? null;
  }
  return data;
}