import "dotenv/config";
import { app } from "./app.js";

const port = process.env.PORT || 3333;

// Última rede de proteção: se algo escapar do tratamento das rotas, o servidor
// registra e continua de pé — cair no meio de uma venda é pior que um erro solto.
process.on("unhandledRejection", (motivo) => {
  console.error("Rejeição não tratada:", motivo);
});

process.on("uncaughtException", (erro) => {
  console.error("Exceção não capturada:", erro);
});

app.listen(port, () => {
  console.log(`Backend Charme Modas rodando em http://localhost:${port}`);
});
