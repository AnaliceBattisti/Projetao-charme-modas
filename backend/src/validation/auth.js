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
  const email = validarEmail(body.email);
  if (typeof body.senha !== "string" || !body.senha.trim()) {
    throw new ValidationError("Senha é obrigatória.");
  }
  return { email, senha: body.senha };
}

export function validarRecuperacaoSenha(body) {
  validarObjeto(body, ["email"]);
  return { email: validarEmail(body.email) };
}

export function validarRedefinicaoSenha(body) {
  validarObjeto(body, ["token", "senha", "confirmacao"]);
  if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) {
    throw new ValidationError(
      "Link inválido ou expirado. Solicite um novo link.",
    );
  }
  const senha = validarSenha(body.senha);
  if (body.confirmacao !== senha)
    throw new ValidationError("As senhas precisam ser iguais.");
  return { token: body.token, senha };
}
