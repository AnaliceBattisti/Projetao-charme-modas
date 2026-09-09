import express from "express";
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

export const app = express();

app.use("/auth", authRouter);
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
  console.error("Erro ao processar requisição:", error);
  res.status(500).json({ error: "Erro interno ao processar a solicitação." });
});

