import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError, normalizeCpf, validateCliente, validateEndereco, validateId } from "../src/validation/clientes.js";

const cliente = { nome: "Maria Teste", cpf: "52998224725" };
const endereco = { cep: "55290-000", logradouro: "Rua de Teste", numero: "s/n", bairro: "Centro", cidade: "Garanhuns", estado: "pe" };

test("normaliza CPF e verifica os dois dígitos, incluindo o caso de dígito zero", () => {
  assert.equal(normalizeCpf(" 529.982.247-25 "), "52998224725");
  assert.equal(normalizeCpf("012.345.678-90"), "01234567890");
  for (const cpf of ["11111111111", "00000000000", "52998224724", "52998224735", "5299822472", "abc52998224725", 52998224725, null]) {
    assert.throws(() => normalizeCpf(cpf), ValidationError);
  }
});

test("normaliza dados de contato e permite limpar campos opcionais", () => {
  assert.deepEqual(validateCliente({ ...cliente, nome: " Maria Teste ", email: " MARIA@EXAMPLE.COM ", telefone: "+55 (87) 99999-0000", profissao: "  ", estadoCivil: null, idade: 0 }), {
    ...cliente, email: "maria@example.com", telefone: "87999990000", profissao: null, estadoCivil: null, idade: 0,
  });
  assert.deepEqual(validateCliente({ email: "", telefone: null, idade: null }, { partial: true }), { email: null, telefone: null, idade: null });
});

test("rejeita campos inválidos, desconhecidos e escritas de relacionamentos", () => {
  const invalid = [null, [], {}, { ...cliente, nome: " " }, { ...cliente, nome: 123 }, { ...cliente, cpf: null },
    { ...cliente, idade: "25" }, { ...cliente, idade: -1 }, { ...cliente, idade: 131 }, { ...cliente, idade: 1.5 },
    { ...cliente, telefone: "1234" }, { ...cliente, telefone: "abc87999990000" }, { ...cliente, email: "sem-email" },
    { ...cliente, email: {} }, { ...cliente, profissao: true }, { ...cliente, id: 1 },
    { ...cliente, compras: { deleteMany: {} } }, { ...cliente, crediario: { create: { limiteCredito: 9999 } } }];
  for (const body of invalid) assert.throws(() => validateCliente(body), ValidationError);
  assert.throws(() => validateCliente({ enderecos: [] }, { partial: true }), ValidationError);
  assert.throws(() => validateCliente({}, { partial: true }), ValidationError);
});

test("valida endereços e impede atribuir clienteId pelo corpo", () => {
  assert.deepEqual(validateEndereco(endereco), { ...endereco, cep: "55290000", estado: "PE" });
  assert.deepEqual(validateEndereco({ complemento: " " }, { partial: true }), { complemento: null });
  for (const body of [{ ...endereco, cep: "123" }, { ...endereco, estado: "XX" }, { ...endereco, numero: 2 },
    { ...endereco, logradouro: "" }, { ...endereco, clienteId: 2 }, {}]) {
    assert.throws(() => validateEndereco(body), ValidationError);
  }
  const data = validateCliente({ ...cliente, enderecos: [endereco] });
  assert.equal(data.enderecos.create[0].estado, "PE");
  for (const enderecos of [null, {}, [null], Array(21).fill(endereco)]) {
    assert.throws(() => validateCliente({ ...cliente, enderecos }), ValidationError);
  }
});

test("aceita apenas IDs positivos dentro do limite do PostgreSQL Int", () => {
  assert.equal(validateId("1"), 1);
  assert.equal(validateId("2147483647"), 2147483647);
  for (const id of ["0", "-1", "1.5", "1e2", "12abc", "2147483648", "999999999999999999", " 1"]) {
    assert.throws(() => validateId(id), ValidationError);
  }
});
