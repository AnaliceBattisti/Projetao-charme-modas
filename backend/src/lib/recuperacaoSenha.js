import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import { gerarSenhaHash } from "./senhas.js";
import { configuracaoEmail, enviarEmail } from "./email.js";
import { ValidationError } from "../validation/clientes.js";

const validadeMs = 30 * 60 * 1000;
const intervaloMs = 5 * 60 * 1000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const linkInvalido = () =>
  new ValidationError("Link inválido ou expirado. Solicite um novo link.");
let tarefas = 0;

export class RecuperacaoIndisponivelError extends Error {}

// Não incluir e-mail, token, senha, corpo da mensagem ou erro SMTP nos logs.
function registrarFalha() {
  console.error(
    "Falha no envio de e-mail de recuperação. Verifique o serviço SMTP.",
  );
}

export function solicitarRecuperacao(email) {
  const config = configuracaoEmail();
  if (tarefas >= 20) throw new RecuperacaoIndisponivelError();
  tarefas++;
  // A consulta e o SMTP ocorrem depois da resposta, também para contas inexistentes.
  // O limite mantém a quantidade de tarefas em memória controlada.
  setImmediate(() => {
    processarSolicitacao(email, config)
      .catch(registrarFalha)
      .finally(() => {
        tarefas--;
      });
  });
}

async function processarSolicitacao(email, config) {
  const token = randomBytes(32).toString("hex");
  const registro = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        papel: "CLIENTE",
        clienteId: { not: null },
      },
      select: { id: true, email: true },
    });
    if (!usuario) return null;
    // Serializa solicitação e consumo por usuário, inclusive entre processos.
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${usuario.id} FOR UPDATE`;
    const anterior = await tx.recuperacaoSenha.findUnique({
      where: { usuarioId: usuario.id },
    });
    if (anterior && anterior.criadoEm.getTime() > Date.now() - intervaloMs)
      return null;
    const dados = {
      tokenHash: hashToken(token),
      criadoEm: new Date(),
      expiraEm: new Date(Date.now() + validadeMs),
    };
    const recuperacao = await tx.recuperacaoSenha.upsert({
      where: { usuarioId: usuario.id },
      create: { usuarioId: usuario.id, ...dados },
      update: dados,
    });
    return { ...recuperacao, email: usuario.email };
  });
  if (!registro) return;
  try {
    // Fragmentos não são enviados ao servidor da loja nem no cabeçalho Referer.
    const link = `${config.loja}/redefinir-senha#token=${token}`;
    await enviarEmail(
      config,
      registro.email,
      "Recuperar sua senha — Charme Modas",
      `Recebemos uma solicitação para recuperar sua senha.\n\nAbra o link para criar uma nova senha:\n${link}\n\nO link é válido por 30 minutos e pode ser usado uma única vez.\nSe você não fez esta solicitação, ignore este e-mail. Sua senha continua a mesma.`,
    );
  } catch (error) {
    await prisma.recuperacaoSenha.deleteMany({
      where: { id: registro.id, tokenHash: registro.tokenHash },
    });
    throw error;
  }
}

export async function redefinirSenha({ token, senha }) {
  const tokenHash = hashToken(token);
  const recuperacao = await prisma.recuperacaoSenha.findUnique({
    where: { tokenHash },
  });
  if (!recuperacao || recuperacao.expiraEm <= new Date()) throw linkInvalido();
  const senhaHash = await gerarSenhaHash(senha);
  const usuario = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${recuperacao.usuarioId} FOR UPDATE`;
    const conta = await tx.usuario.findFirst({
      where: {
        id: recuperacao.usuarioId,
        papel: "CLIENTE",
        clienteId: { not: null },
      },
      select: { id: true, email: true },
    });
    if (!conta) throw linkInvalido();
    const consumido = await tx.recuperacaoSenha.deleteMany({
      where: { usuarioId: conta.id, tokenHash, expiraEm: { gt: new Date() } },
    });
    if (consumido.count !== 1) throw linkInvalido();
    await tx.usuario.update({ where: { id: conta.id }, data: { senhaHash } });
    await tx.sessaoUsuario.deleteMany({ where: { usuarioId: conta.id } });
    return conta;
  });
  // A confirmação por e-mail não desfaz uma troca já concluída se o SMTP falhar.
  setImmediate(() => {
    Promise.resolve()
      .then(() =>
        enviarEmail(
          configuracaoEmail(),
          usuario.email,
          "Sua senha foi alterada — Charme Modas",
          "Sua senha da Charme Modas foi alterada e as sessões anteriores foram encerradas.\nSe você não reconhece esta alteração, entre em contato com a loja.",
        ),
      )
      .catch(registrarFalha);
  });
}
