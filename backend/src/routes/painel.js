import { Router, json } from "express";
import cors from "cors";
import { prisma } from "../lib/prisma.js";
import { gerarSenhaHash, verificarSenha } from "../lib/senhas.js";
import {
  encerrarSessaoPainel,
  funcionarioDaSessao,
  iniciarSessaoPainel,
  selecionarFuncionario,
  PAPEIS_INTERNOS,
} from "../lib/sessoesPainel.js";
import { exigirAdmin, exigirEquipe } from "../middleware/exigirEquipe.js";

const router = Router();

// Mesma proteção que a loja usa em /auth: o cookie de sessão só é aceito a partir
// das origens conhecidas do painel, e nunca com Allow-Origin curinga.
const origens = new Set(
  (
    process.env.PAINEL_ORIGENS ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
  )
    .split(",")
    .map((valor) => valor.trim())
);

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.headers.origin && !origens.has(req.headers.origin)) {
    return res.status(403).json({ error: "Origem não autorizada." });
  }
  next();
});

router.use(
  cors({
    origin: (origem, callback) => callback(null, Boolean(origem && origens.has(origem))),
    credentials: true,
  })
);

// Parser próprio: como este router é montado antes do app.use(express.json())
// global (precisa vir antes do cors() aberto, ou o preflight de login nunca
// chegaria até aqui), depender do parser global deixaria req.body sempre vazio.
router.use(json({ limit: "16kb" }));

const SENHA_MINIMA = 8;

function validarSenha(senha) {
  if (typeof senha !== "string" || senha.length < SENHA_MINIMA) {
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  }
  if (senha.length > 128) return "A senha é longa demais.";
  return null;
}

function normalizarEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// ---------- sessão ----------

router.post("/login", async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const senha = req.body?.senha;
  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { ...selecionarFuncionario, senhaHash: true },
  });
  const confere = await verificarSenha(senha, usuario?.senhaHash);
  // Mensagem única de propósito: não entregamos se o e-mail existe ou não.
  if (!confere || !PAPEIS_INTERNOS.includes(usuario.papel)) {
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }
  await iniciarSessaoPainel(req, res, usuario.id);
  const { senhaHash, ...dados } = usuario;
  res.json({ funcionario: dados });
});

router.post("/logout", async (req, res) => {
  await encerrarSessaoPainel(req, res);
  res.status(204).send();
});

router.get("/eu", async (req, res) => {
  const funcionario = await funcionarioDaSessao(req);
  if (!funcionario) return res.status(401).json({ error: "Sessão encerrada." });
  res.json({ funcionario });
});

// ---------- equipe ----------

router.get("/funcionarios", exigirEquipe, async (req, res) => {
  const funcionarios = await prisma.usuario.findMany({
    where: { papel: { in: PAPEIS_INTERNOS } },
    select: selecionarFuncionario,
    orderBy: { nome: "asc" },
  });
  res.json(funcionarios);
});

router.post("/funcionarios", exigirAdmin, async (req, res) => {
  const { nome, papel = "OPERADOR", senha } = req.body ?? {};
  const email = normalizarEmail(req.body?.email);

  if (!nome?.trim()) return res.status(400).json({ error: "Informe o nome do funcionário." });
  if (!email.includes("@")) return res.status(400).json({ error: "Informe um e-mail válido." });
  if (!PAPEIS_INTERNOS.includes(papel)) {
    return res.status(400).json({ error: "O perfil deve ser administrador ou operador." });
  }
  const erroSenha = validarSenha(senha);
  if (erroSenha) return res.status(400).json({ error: erroSenha });

  const jaExiste = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
  if (jaExiste) return res.status(409).json({ error: "Já existe uma conta com esse e-mail." });

  const funcionario = await prisma.usuario.create({
    data: { nome: nome.trim(), email, papel, senhaHash: await gerarSenhaHash(senha) },
    select: selecionarFuncionario,
  });
  res.status(201).json(funcionario);
});

router.put("/funcionarios/:id", exigirAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { nome, papel, senha } = req.body ?? {};

  const alvo = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, papel: true },
  });
  if (!alvo || !PAPEIS_INTERNOS.includes(alvo.papel)) {
    return res.status(404).json({ error: "Funcionário não encontrado." });
  }
  if (papel !== undefined && !PAPEIS_INTERNOS.includes(papel)) {
    return res.status(400).json({ error: "O perfil deve ser administrador ou operador." });
  }
  // Rebaixar o último administrador deixaria a loja sem ninguém para gerenciar a equipe.
  if (papel === "OPERADOR" && alvo.papel === "ADMIN" && (await contarAdmins()) <= 1) {
    return res.status(400).json({
      error: "Este é o único administrador. Promova outra pessoa antes de mudar o perfil.",
    });
  }
  if (senha !== undefined) {
    const erroSenha = validarSenha(senha);
    if (erroSenha) return res.status(400).json({ error: erroSenha });
  }

  const funcionario = await prisma.usuario.update({
    where: { id },
    data: {
      ...(nome?.trim() ? { nome: nome.trim() } : {}),
      ...(papel ? { papel } : {}),
      ...(senha !== undefined ? { senhaHash: await gerarSenhaHash(senha) } : {}),
    },
    select: selecionarFuncionario,
  });
  // Trocar a senha derruba as sessões abertas daquela pessoa.
  if (senha !== undefined) {
    await prisma.sessaoUsuario.deleteMany({ where: { usuarioId: id } });
  }
  res.json(funcionario);
});

router.delete("/funcionarios/:id", exigirAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.funcionario.id) {
    return res.status(400).json({ error: "Você não pode remover a sua própria conta." });
  }
  const alvo = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, papel: true },
  });
  if (!alvo || !PAPEIS_INTERNOS.includes(alvo.papel)) {
    return res.status(404).json({ error: "Funcionário não encontrado." });
  }
  if (alvo.papel === "ADMIN" && (await contarAdmins()) <= 1) {
    return res.status(400).json({ error: "A loja precisa de pelo menos um administrador." });
  }
  await prisma.usuario.delete({ where: { id } });
  res.status(204).send();
});

function contarAdmins() {
  return prisma.usuario.count({ where: { papel: "ADMIN" } });
}

export default router;
