import nodemailer from "nodemailer";

export class ConfiguracaoEmailError extends Error {}

export function configuracaoEmail() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.EMAIL_FROM?.trim();
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  let loja;
  try {
    loja = new URL(process.env.LOJA_URL);
  } catch {
    throw new ConfiguracaoEmailError();
  }
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !from ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from) ||
    ![undefined, "", "true", "false"].includes(process.env.SMTP_SECURE) ||
    Boolean(user) !== Boolean(pass) ||
    !["http:", "https:"].includes(loja.protocol) ||
    loja.username ||
    loja.password ||
    loja.pathname !== "/" ||
    loja.search ||
    loja.hash ||
    (loja.protocol !== "https:" &&
      (process.env.NODE_ENV === "production" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(loja.hostname)))
  ) {
    console.error("Validação falhou! O que o Node recebeu:", { host, port, from, secure: process.env.SMTP_SECURE, url: loja?.href });
    throw new ConfiguracaoEmailError();
  } 
  const local =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "::1"].includes(host);
  return {
    from,
    loja: loja.origin,
    smtp: {
      host,
      port,
      secure,
      requireTLS: !local && !secure,
      ...(user ? { auth: { user, pass } } : {}),
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    },
  };
}

export async function enviarEmail(config, email, subject, text) {
  const transporte = nodemailer.createTransport(config.smtp);
  try {
    await transporte.sendMail({
      from: { name: "Charme Modas", address: config.from },
      to: { address: email },
      subject,
      text,
    });
  } finally {
    transporte.close();
  }
}
