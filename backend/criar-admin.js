import { prisma } from "./src/lib/prisma.js";
import { gerarSenhaHash } from "./src/lib/senhas.js";

async function main() {
  const admin = await prisma.usuario.create({
    data: {
      nome: "Administrador",
      email: "contatocharme.m@gmail.com",
      senhaHash: await gerarSenhaHash("Charme@dmin727"),
      papel: "ADMIN",
    }
  });
  console.log(`Admin criado! ID: ${admin.id}`);
}

main().finally(() => prisma.$disconnect());