import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // 5173 fica com o painel administrativo.
  server: { port: 5174 },
});
