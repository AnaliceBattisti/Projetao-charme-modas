import { ValidationError, validateCliente } from "./clientes.js";

function validarObjeto(body, campos) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Envie um objeto JSON com os dados da conta.");
  }
  if (Object.keys(body).some((campo) => !campos.includes(campo))) {
    throw new ValidationError("O cadastro contém campos não permitidos.");
  }
}

function validarEmail(email) {
  if (typeof email !== "string" || !email.trim())
    throw new ValidationError("E-mail é obrigatório.");
  return validateCliente({ email }, { partial: true }).email;
}

function validarSenha(senha) {
  if (
    typeof senha !== "string" ||
    senha.length < 8 ||
    senha.length > 128 ||
    !/\S/.test(senha)
  ) {
    throw new ValidationError("A senha deve ter entre 8 e 128 caracteres.");
  }
  return senha;
}

export function validarCadastro(body) {
  validarObjeto(body, [
    "nome",
    "email",
    "senha",
    "confirmacao",
    "cpf",
    "telefone",
    "idade",
    "profissao",
    "estadoCivil",
    "enderecos",
  ]);
  const { senha, confirmacao, ...dadosCliente } = body;
  validarSenha(senha);
  if (confirmacao !== senha)
    throw new ValidationError("As senhas precisam ser iguais.");
  dadosCliente.email = validarEmail(body.email);
  const cliente = validateCliente(dadosCliente);
  return { cliente, senha };
}

export function validarLogin(body) {
  validarObjeto(body, ["email", "senha"]);
  return { email: validarEmail(body.email), senha: validarSenha(body.senha) };
}
