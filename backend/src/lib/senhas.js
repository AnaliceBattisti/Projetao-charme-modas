import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derivar = promisify(scrypt);
// Parâmetros scrypt recomendados pela OWASP; salt exclusivo de 16 bytes.
const parametros = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefixo = "scrypt$32768$8$3";
const formato = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
const hashSimulado = `${prefixo}$${"0".repeat(32)}$${"0".repeat(128)}`;

export async function gerarSenhaHash(senha) {
  const salt = randomBytes(16);
  const chave = await derivar(senha, salt, 64, parametros);
  return `${prefixo}$${salt.toString("hex")}$${chave.toString("hex")}`;
}

export async function verificarSenha(senha, senhaHash) {
  if (typeof senha !== "string" || senha.length > 128) return false;
  const partes = formato.exec(typeof senhaHash === "string" ? senhaHash : "");
  // Mesmo custo de derivação para contas inexistentes ou hashes inválidos.
  const [, salt, hash] = partes || formato.exec(hashSimulado);
  const chave = await derivar(senha, Buffer.from(salt, "hex"), 64, parametros);
  return timingSafeEqual(chave, Buffer.from(hash, "hex")) && Boolean(partes);
}
