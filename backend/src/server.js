import "dotenv/config";
import { app } from "./app.js";

const port = process.env.PORT || 3333;

app.listen(port, () => {
  console.log(`Backend Charme Modas rodando em http://localhost:${port}`);
});
