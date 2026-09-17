import express from "express";
// Precisa vir antes das rotas: o Express 4 não captura erro dentro de handler
// async, e sem isso qualquer rejeição não tratada derruba o processo inteiro
// em vez de virar uma resposta de erro. Com isso, tudo cai no handler do fim.
import "express-async-errors";
import cors from "cors";
import path from "node:path";

import fornecedoresRouter from "./routes/fornecedores.js";
import produtosRouter from "./routes/produtos.js";
import estoqueRouter from "./routes/estoque.js";
import clientesRouter from "./routes/clientes.js";
import crediarioRouter from "./routes/crediario.js";
import comprasRouter from "./routes/compras.js";
import parcelasRouter from "./routes/parcelas.js";
import authRouter from "./routes/auth.js";
import painelRouter from "./routes/painel.js";

export const app = express();

// /auth e /painel precisam vir antes do cors() genérico: o pacote cors responde
// e encerra o OPTIONS de preflight sozinho, sem chamar next(). Se o cors() aberto
// (Allow-Origin: *) rodasse primeiro, ele responderia ao preflight de login antes
// do CORS restrito de cada router ter a chance de agir — e o navegador bloqueia
// wildcard combinado com credentials: "include" ("Failed to fetch").
app.use("/auth", authRouter);
app.use("/painel", painelRouter);
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/fornecedores", fornecedoresRouter);
app.use("/produtos", produtosRouter);
app.use("/estoque", estoqueRouter);
app.use("/clientes", clientesRouter);
app.use("/crediarios", crediarioRouter);
app.use("/compras", comprasRouter);
app.use("/parcelas", parcelasRouter);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "O corpo da requisição deve conter um JSON válido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "O corpo da requisição excede o tamanho permitido." });
  }
  // Erros conhecidos do Prisma viram mensagem em português em vez de 500 seco.
  // O mesmo P2003 tem dois significados: apagar algo em uso, ou apontar para algo
  // que não existe. O método diz qual dos dois é.
  if (error.code === "P2003") {
    return res.status(409).json({
      error:
        req.method === "DELETE"
          ? "Este registro está sendo usado por outros cadastros e não pode ser removido."
          : "Um dos cadastros informados não existe. Confira o fornecedor, cliente ou produto selecionado.",
    });
  }
  if (error.code === "P2002") {
    return res.status(409).json({ error: "Já existe um cadastro com esses dados." });
  }
  if (error.code === "P2025") {
    return res.status(404).json({ error: "Registro não encontrado." });
  }
  console.error("Erro ao processar requisição:", error);
  res.status(500).json({ error: "Erro interno ao processar a solicitação." });
});

