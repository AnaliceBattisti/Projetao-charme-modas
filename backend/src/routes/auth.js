import { Router, json } from "express";
import cors from "cors";
import { prisma } from "../lib/prisma.js";
import { gerarSenhaHash, verificarSenha } from "../lib/senhas.js";
import {
  encerrarSessao,
  iniciarSessao,
  selecionarUsuario,
} from "../lib/sessoes.js";
import { limitarTentativas } from "../middleware/limitarTentativas.js";
import { exigirConta } from "../middleware/exigirConta.js";
import { validarCadastro, validarLogin, validarPrimeiroAcesso } from "../validation/auth.js";
import recuperacaoSenhaRouter from "./recuperacaoSenha.js";
import { enviarPedido, listarPedidos, consultarPedido } from "../services/pedidos.js";
import {
  cpfFormats,
  validateCliente,
  validateEndereco,
  validateId,
  ValidationError,
} from "../validation/clientes.js";
import { configuracaoEmail, enviarEmail, ConfiguracaoEmailError } from "../lib/email.js";
import crypto from "crypto";

const router = Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
const origens = new Set(
  (
    process.env.LOJA_ORIGENS ||
    "http://localhost:5174,http://127.0.0.1:5174,http://localhost:4174,http://127.0.0.1:4174"
  )
    .split(",")
    .map((valor) => valor.trim()),
);

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.headers.origin && !origens.has(req.headers.origin)) {
    return res.status(403).json({ error: "Origem não autorizada." });
  }
  if (
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    !req.is("application/json")
  ) {
    return res
      .status(415)
      .json({ error: "Envie Content-Type: application/json." });
  }
  next();
});
router.use(
  cors({
    origin: (origem, callback) =>
      callback(null, Boolean(origem && origens.has(origem))),
    credentials: true,
  }),
);
router.use(json({ limit: "32kb" }));
router.use(recuperacaoSenhaRouter);

router.post(
  "/cadastro",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { cliente, senha } = validarCadastro(req.body);
    const [usuarioExistente, clienteExistente] = await Promise.all([
      prisma.usuario.findFirst({
        where: { email: { equals: cliente.email, mode: "insensitive" } },
        select: { id: true },
      }),
      prisma.cliente.findFirst({
        where: { cpf: { in: cpfFormats(cliente.cpf) } },
        select: { id: true },
      }),
    ]);
    if (usuarioExistente || clienteExistente) {
      return res.status(409).json({
        error:
          "E-mail ou CPF já cadastrado. Entre na sua conta ou fale com a loja para vincular um cadastro existente.",
      });
    }
    const senhaHash = await gerarSenhaHash(senha);
    const limiteInicial = Number(process.env.EXPOSICAO_CREDITO_CREDIARIO) || 0;
    // O nested create do Prisma é atômico: usuário, cliente, endereços e crédito juntos.
    const usuario = await prisma.usuario.create({
      data: {
        nome: cliente.nome,
        email: cliente.email,
        senhaHash,
        papel: "CLIENTE",
        cliente: {
          create: {
            ...cliente,
            crediario: {
              create: {
                limiteCredito: limiteInicial,
                limiteDisponivel: limiteInicial,
              },
            },
          },
        },
      },
      select: selecionarUsuario,
    });
    res.status(201).json({ usuario });
  }),
);

router.post(
  "/primeiro-acesso",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { cliente, senha } = validarPrimeiroAcesso(req.body);
    const [usuarioExistente, clienteExistente] = await Promise.all([
      prisma.usuario.findFirst({
        where: { email: { equals: cliente.email, mode: "insensitive" } },
        select: { id: true },
      }),
      prisma.cliente.findFirst({
        where: { cpf: { in: cpfFormats(cliente.cpf) } },
        select: { id: true },
      }),
    ]);
    if (usuarioExistente) {
      return res.status(409).json({
        error:
          "Conta já registrada para este e-mail. Entre na sua conta ou fale com a loja para ajustar seu cadastro existente.",
      });
    }
    if (!clienteExistente) {
      return res.status(404).json({
        error:
          "Nenhum Cliente registrado para esse CPF.",
      });
    }
    const senhaHash = await gerarSenhaHash(senha);
    const usuario = await prisma.usuario.create({
      data: {
        nome: cliente.nome,
        email: cliente.email,
        senhaHash,
        papel: "CLIENTE",
        clienteId: Number(clienteExistente.id),
      },
      select: selecionarUsuario,
    });
    res.status(201).json({ usuario });
  }),
);


router.post(
  "/login",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { email, senha } = validarLogin(req.body);
    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { ...selecionarUsuario, senhaHash: true },
    });
    const senhaCorreta = await verificarSenha(senha, usuario?.senhaHash);
    if (!senhaCorreta || usuario?.papel !== "CLIENTE" || !usuario.cliente) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }
    await iniciarSessao(req, res, usuario.id);
    const { senhaHash, ...dadosPublicos } = usuario;
    res.json({ usuario: dadosPublicos });
  }),
);

router.post(
  "/admin/login",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { email, senha } = validarLogin(req.body);
    
    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { ...selecionarUsuario, senhaHash: true },
    });
    
    const senhaCorreta = await verificarSenha(senha, usuario?.senhaHash);
    
    // Barra quem errar a senha ou não for ADMIN
    if (!senhaCorreta || usuario?.papel !== "ADMIN") {
      return res.status(401).json({ error: "E-mail ou senha inválidos, ou acesso negado." });
    }
    
    await iniciarSessao(req, res, usuario.id);
    const { senhaHash, ...dadosPublicos } = usuario;
    res.json({ usuario: dadosPublicos });
  }),
);

router.post(
  "/recuperar-senha",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "E-mail obrigatório." });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (usuario) {
      let config;
      try {
        config = configuracaoEmail();
      } catch (err) {
        return res.json({ message: "Se o e-mail estiver cadastrado, as instruções foram enviadas." });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expira = new Date(Date.now() + 3600000); // Validade de 1 hora

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaResetToken: token, senhaResetExpira: expira },
      });

      const linkRecuperacao = `${config.loja}/admin/redefinir-senha#token=${token}`;
      const textoMensagem = `Olá, ${usuario.nome}.\n\nVocê solicitou a recuperação de senha para o painel administrativo da Charme Modas.\n\nAcesse o link abaixo para continuar:\n${linkRecuperacao}\n\nSe você não solicitou isso, ignore este e-mail.`;

      enviarEmail(config, usuario.email, "Redefinição de Senha - Charme Modas", textoMensagem).catch(err => {
        console.error("Erro ao disparar e-mail de recuperação:", err);
      });
    }
    
    return res.json({ 
      message: "Se o e-mail estiver cadastrado, as instruções foram enviadas." 
    });
  })
);

router.post(
  "/redefinir-senha",
  limitarTentativas(),
  asyncRoute(async (req, res) => {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({ error: "Token e nova senha são obrigatórios." });
    }

    // Busca usuário pelo token E verifica se não está expirado
    const usuario = await prisma.usuario.findFirst({
      where: {
        senhaResetToken: token,
        senhaResetExpira: { gte: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({ error: "Link inválido ou expirado. Solicite uma nova recuperação." });
    }

    const senhaHash = await gerarSenhaHash(senha);

    // Atualiza a senha e limpa o token
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash,
        senhaResetToken: null,
        senhaResetExpira: null,
      },
    });

    res.json({ mensagem: "Senha redefinida com sucesso!" });
  })
);

// Toda operação da própria conta usa o vínculo da sessão, nunca um ID enviado pelo cliente.
router.use("/me", exigirConta);
router.get("/me", (req, res) => res.json({ usuario: req.usuario }));

router.get("/me/pedidos", asyncRoute(async (req, res) => {
  const pagina = req.query.pagina ?? "1";
  if (typeof pagina !== "string" || !/^[1-9]\d{0,5}$/.test(pagina)) {
    throw new ValidationError("Informe uma página válida.");
  }
  res.json(await listarPedidos(req.usuario.clienteId, Number(pagina)));
}));

router.get("/me/pedidos/:pedidoId", asyncRoute(async (req, res) => {
  const pedido = await consultarPedido(req.usuario.clienteId, validateId(req.params.pedidoId));
  if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });
  res.json({ pedido });
}));

router.post("/me/pedidos", limitarTentativas(), asyncRoute(async (req, res) => {
  const pedido = await enviarPedido(req.usuario.clienteId, req.body);
  res.status(201).json({ pedido });
}));

router.put(
  "/me",
  asyncRoute(async (req, res) => {
    const dados = validateCliente(req.body, { partial: true });
    if (Object.hasOwn(dados, "email")) {
      throw new ValidationError("O e-mail não pode ser alterado pela edição da conta.");
    }
    if (
      dados.cpf &&
      (await prisma.cliente.findFirst({
        where: {
          cpf: { in: cpfFormats(dados.cpf) },
          id: { not: req.usuario.clienteId },
        },
        select: { id: true },
      }))
    ) {
      return res
        .status(409)
        .json({ error: "CPF já cadastrado para outro cliente." });
    }
    const usuario = await prisma.usuario.update({
      where: {
        id: req.usuario.id,
        clienteId: req.usuario.clienteId,
        papel: "CLIENTE",
      },
      data: {
        ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
        cliente: { update: dados },
      },
      select: selecionarUsuario,
    });
    res.json({ usuario });
  }),
);

router.post(
  "/me/enderecos",
  asyncRoute(async (req, res) => {
    const dados = validateEndereco(req.body);
    const endereco = await prisma.enderecoCliente.create({
      data: { ...dados, clienteId: req.usuario.clienteId },
    });
    res.status(201).json(endereco);
  }),
);

router.put(
  "/me/enderecos/:enderecoId",
  asyncRoute(async (req, res) => {
    const id = validateId(req.params.enderecoId);
    const dados = validateEndereco(req.body, { partial: true });
    const endereco = await prisma.enderecoCliente.update({
      where: { id, clienteId: req.usuario.clienteId },
      data: dados,
    });
    res.json(endereco);
  }),
);

router.delete(
  "/me/enderecos/:enderecoId",
  asyncRoute(async (req, res) => {
    const id = validateId(req.params.enderecoId);
    await prisma.enderecoCliente.delete({
      where: { id, clienteId: req.usuario.clienteId },
    });
    res.status(204).send();
  }),
);

router.post(
  "/logout",
  asyncRoute(async (req, res) => {
    await encerrarSessao(req, res);
    res.status(204).send();
  }),
);

router.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ error: "O corpo da requisição deve conter um JSON válido." });
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "O corpo da requisição excede o tamanho permitido." });
  if (error instanceof ValidationError)
    return res.status(400).json({ error: error.message });
  if (error.code === "P2002")
    return res.status(409).json({ error: "E-mail ou CPF já cadastrado." });
  if (error.code === "P2025")
    return res
      .status(404)
      .json({ error: "Cadastro ou endereço não encontrado." });
  // Não registrar corpo da requisição, credenciais ou argumentos de queries.
  console.error("Falha detalhada no backend:", error);
  res.status(500).json({
    error: "Não foi possível acessar o serviço de contas. Tente novamente.",
  });
});

export default router;
