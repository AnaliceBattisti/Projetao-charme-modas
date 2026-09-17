import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

const cookieNome = "cm_loja_sessao";
const duracao = 7 * 24 * 60 * 60 * 1000;
const opcoesCookie = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

function tokenDaRequisicao(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${cookieNome}=`));
  const token = cookie?.slice(cookieNome.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export const selecionarUsuario = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  clienteId: true,
  cliente: {
    select: {
      id: true,
      nome: true,
      cpf: true,
      email: true,
      telefone: true,
      idade: true,
      profissao: true,
      estadoCivil: true,
      enderecos: { orderBy: { id: "asc" } },
    },
  },
};

export async function encerrarSessao(req, res) {
  const token = tokenDaRequisicao(req);
  if (token)
    await prisma.sessaoUsuario.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  res.clearCookie(cookieNome, opcoesCookie());
}

export async function iniciarSessao(req, res, usuarioId) {
  const token = randomBytes(32).toString("hex");
  const anterior = tokenDaRequisicao(req);
  await prisma.$transaction([
    prisma.sessaoUsuario.deleteMany({
      where: {
        OR: [
          { expiraEm: { lte: new Date() } },
          ...(anterior ? [{ tokenHash: hashToken(anterior) }] : []),
        ],
      },
    }),
    prisma.sessaoUsuario.create({
      data: {
        usuarioId,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + duracao),
      },
    }),
  ]);
  res.cookie(cookieNome, token, { ...opcoesCookie(), maxAge: duracao });
}

export async function usuarioDaSessao(req) {
  const token = tokenDaRequisicao(req);
  if (!token) return null;
  const sessao = await prisma.sessaoUsuario.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiraEm: true, usuario: { select: selecionarUsuario } },
  });
  if (
    !sessao ||
    sessao.expiraEm <= new Date() ||
    sessao.usuario.papel !== "CLIENTE" ||
    !sessao.usuario.cliente
  )
    return null;
  return sessao.usuario;
}
