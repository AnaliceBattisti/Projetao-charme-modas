import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

// Sessão da EQUIPE (painel administrativo). Usa a mesma tabela SessaoUsuario das
// contas da loja, mas com cookie próprio: o da loja vale só em /auth e é exclusivo
// de papel CLIENTE. Aqui o cookie precisa valer em todas as rotas do painel.
const cookieNome = "cm_painel_sessao";
const duracao = 12 * 60 * 60 * 1000; // 12h: turno de trabalho, não uma semana
const PAPEIS_INTERNOS = ["ADMIN", "OPERADOR"];

const opcoesCookie = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export const selecionarFuncionario = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  criadoEm: true,
};

function tokenDaRequisicao(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((valor) => valor.trim())
    .find((valor) => valor.startsWith(`${cookieNome}=`));
  const token = cookie?.slice(cookieNome.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function iniciarSessaoPainel(req, res, usuarioId) {
  const token = randomBytes(32).toString("hex");
  const anterior = tokenDaRequisicao(req);
  await prisma.$transaction([
    // Aproveita para varrer sessões vencidas e derrubar a anterior deste navegador.
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

export async function encerrarSessaoPainel(req, res) {
  const token = tokenDaRequisicao(req);
  if (token) {
    await prisma.sessaoUsuario.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  res.clearCookie(cookieNome, opcoesCookie());
}

export async function funcionarioDaSessao(req) {
  const token = tokenDaRequisicao(req);
  if (!token) return null;
  const sessao = await prisma.sessaoUsuario.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiraEm: true, usuario: { select: selecionarFuncionario } },
  });
  if (!sessao || sessao.expiraEm <= new Date()) return null;
  // Conta de cliente não entra no painel, mesmo com token válido.
  if (!PAPEIS_INTERNOS.includes(sessao.usuario.papel)) return null;
  return sessao.usuario;
}

export { PAPEIS_INTERNOS };
