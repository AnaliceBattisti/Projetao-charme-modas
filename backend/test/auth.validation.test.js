import test from "node:test";
import assert from "node:assert/strict";
import { validarCadastro, validarLogin } from "../src/validation/auth.js";
import { gerarSenhaHash, verificarSenha } from "../src/lib/senhas.js";
import { limitarTentativas } from "../src/middleware/limitarTentativas.js";

const cadastro = {
  nome: " Maria Teste ",
  cpf: "529.982.247-25",
  email: " MARIA@EXAMPLE.COM ",
  telefone: "+55 (87) 99999-0000",
  senha: "Senha de exemplo 123!",
  confirmacao: "Senha de exemplo 123!",
};

test("separa a senha dos dados pessoais e reutiliza a normalização de clientes", () => {
  const { cliente, senha } = validarCadastro(cadastro);
  assert.deepEqual(cliente, {
    nome: "Maria Teste",
    cpf: "52998224725",
    email: "maria@example.com",
    telefone: "87999990000",
  });
  assert.equal(senha, cadastro.senha);
  assert.equal(Object.hasOwn(cliente, "senha"), false);
  assert.equal(cadastro.nome, " Maria Teste ");
});

test("rejeita perfis administrativos, IDs, hashes e vínculos enviados pelo público", () => {
  for (const campo of [
    "papel",
    "id",
    "clienteId",
    "usuarioId",
    "senhaHash",
    "cliente",
    "usuario",
    "compras",
    "crediario",
  ]) {
    assert.throws(
      () => validarCadastro({ ...cadastro, [campo]: "ADMIN" }),
      /não permitidos/,
    );
  }
});

test("valida CPF, email, dados pessoais, confirmação e tamanho da senha", () => {
  for (const dados of [
    null,
    [],
    {},
    { ...cadastro, cpf: "00000000000" },
    { ...cadastro, email: "" },
    { ...cadastro, email: null },
    { ...cadastro, email: "invalido" },
    { ...cadastro, nome: "" },
    { ...cadastro, telefone: "123" },
    { ...cadastro, confirmacao: "diferente" },
    { ...cadastro, confirmacao: undefined },
  ]) {
    assert.throws(() => validarCadastro(dados));
  }
  for (const senha of [
    null,
    12345678,
    "1234567",
    " ".repeat(8),
    "x".repeat(129),
  ]) {
    assert.throws(
      () => validarCadastro({ ...cadastro, senha, confirmacao: senha }),
      /senha/i,
    );
  }
  const senha = " senha com espaços e ç ";
  assert.equal(
    validarCadastro({ ...cadastro, senha, confirmacao: senha }).senha,
    senha,
  );
  assert.equal(
    validarCadastro({
      ...cadastro,
      senha: "x".repeat(128),
      confirmacao: "x".repeat(128),
    }).senha.length,
    128,
  );
});

test("login normaliza apenas o email e rejeita campos indevidos", () => {
  const senha = "  senha original  ";
  assert.deepEqual(validarLogin({ email: " MARIA@EXAMPLE.COM ", senha }), {
    email: "maria@example.com",
    senha,
  });
  assert.throws(() =>
    validarLogin({ email: cadastro.email, senha, papel: "ADMIN" }),
  );
});

test("login exige senha preenchida sem aplicar as regras de criação de senha", () => {
  for (const senha of ["1", "1234567", "x".repeat(129), " senha "]) {
    assert.equal(validarLogin({ email: cadastro.email, senha }).senha, senha);
  }
  for (const senha of [undefined, null, 12345678, "", "   "]) {
    assert.throws(
      () => validarLogin({ email: cadastro.email, senha }),
      /Senha é obrigatória\./,
    );
  }
  assert.throws(
    () => validarLogin({ email: "", senha: "1" }),
    /E-mail é obrigatório\./,
  );
});

test("hash tem salt aleatório, verifica senha e não aceita hashes malformados", async () => {
  const primeiro = await gerarSenhaHash(cadastro.senha);
  const segundo = await gerarSenhaHash(cadastro.senha);
  assert.notEqual(primeiro, segundo);
  assert.match(primeiro, /^scrypt\$32768\$8\$3\$/);
  assert.equal(primeiro.includes(cadastro.senha), false);
  assert.equal(await verificarSenha(cadastro.senha, primeiro), true);
  assert.equal(await verificarSenha("Senha errada", primeiro), false);
  assert.equal(await verificarSenha(cadastro.senha, "malformado"), false);
  assert.equal(await verificarSenha(cadastro.senha, null), false);
  assert.equal(await verificarSenha("x".repeat(129), primeiro), false);
});

test("limita tentativas por IP sem confiar no conteúdo da requisição", () => {
  const limitar = limitarTentativas({ limite: 2, janelaMs: 10000 });
  let passou = 0;
  const resposta = {
    set(nome, valor) {
      this[nome] = valor;
      return this;
    },
    status(valor) {
      this.codigo = valor;
      return this;
    },
    json(valor) {
      this.body = valor;
    },
  };
  limitar({ ip: "127.0.0.1" }, resposta, () => passou++);
  limitar({ ip: "127.0.0.1" }, resposta, () => passou++);
  limitar({ ip: "127.0.0.1" }, resposta, () => passou++);
  assert.equal(passou, 2);
  assert.equal(resposta.codigo, 429);
  assert.ok(Number(resposta["Retry-After"]) > 0);
  limitar({ ip: "127.0.0.2" }, resposta, () => passou++);
  assert.equal(passou, 3);
});
