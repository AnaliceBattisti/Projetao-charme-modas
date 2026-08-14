import express from "express";
import cors from "cors";

import fornecedoresRouter from "./routes/fornecedores.js";
import produtosRouter from "./routes/produtos.js";
import estoqueRouter from "./routes/estoque.js";
import clientesRouter from "./routes/clientes.js";
import crediarioRouter from "./routes/crediario.js";
import comprasRouter from "./routes/compras.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/fornecedores", fornecedoresRouter);
app.use("/produtos", produtosRouter);
app.use("/estoque", estoqueRouter);
app.use("/clientes", clientesRouter);
app.use("/crediario", crediarioRouter);
app.use("/compras", comprasRouter);
