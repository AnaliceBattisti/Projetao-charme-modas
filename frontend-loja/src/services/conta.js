import { request } from "../api.js";

export const cadastrarConta = (dados) =>
  request("/auth/cadastro", { method: "POST", body: dados });
export const entrarNaConta = (dados) =>
  request("/auth/login", { method: "POST", body: dados });
export const consultarConta = () => request("/auth/me");
export const atualizarConta = (dados) =>
  request("/auth/me", { method: "PUT", body: dados });
export const criarEnderecoConta = (dados) =>
  request("/auth/me/enderecos", { method: "POST", body: dados });
export const atualizarEnderecoConta = (id, dados) =>
  request(`/auth/me/enderecos/${id}`, { method: "PUT", body: dados });
export const removerEnderecoConta = (id) =>
  request(`/auth/me/enderecos/${id}`, { method: "DELETE" });
export const sairDaConta = () =>
  request("/auth/logout", { method: "POST", body: {} });
export const solicitarRecuperacaoSenha = (dados) =>
  request("/auth/esqueci-senha", { method: "POST", body: dados });
export const redefinirSenhaConta = (dados) =>
  request("/auth/redefinir-senha", { method: "POST", body: dados });
