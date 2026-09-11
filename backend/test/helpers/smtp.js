import { createServer } from "node:net";
import { once } from "node:events";

// Servidor SMTP mínimo de teste: nenhuma mensagem sai da máquina.
export async function smtpDeTeste() {
  const mensagens = [];
  const sockets = new Set();
  const smtp = { mensagens, falhar: false };
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    socket.setEncoding("utf8");
    socket.write("220 localhost SMTP teste\r\n");
    let buffer = "",
      corpo = null,
      destinatario = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let fim;
      while ((fim = buffer.indexOf("\r\n")) >= 0) {
        const linha = buffer.slice(0, fim);
        buffer = buffer.slice(fim + 2);
        if (corpo !== null) {
          if (linha === ".") {
            const raw = corpo.join("\r\n");
            const conteudo = raw.slice(raw.indexOf("\r\n\r\n") + 4);
            const text = /Content-Transfer-Encoding: base64/i.test(raw)
              ? Buffer.from(conteudo, "base64").toString("utf8")
              : conteudo
                  .replace(/=\r\n/g, "")
                  .replace(/=([0-9A-F]{2})/gi, (_, hex) =>
                    String.fromCharCode(parseInt(hex, 16)),
                  );
            mensagens.push({ destinatario, raw, text });
            corpo = null;
            socket.write("250 Message accepted\r\n");
          } else corpo.push(linha.replace(/^\.\./, "."));
        } else if (/^(EHLO|HELO)/i.test(linha))
          socket.write("250 localhost\r\n");
        else if (/^MAIL FROM:/i.test(linha))
          socket.write(smtp.falhar ? "550 Test failure\r\n" : "250 OK\r\n");
        else if (/^RCPT TO:/i.test(linha)) {
          destinatario = linha.match(/<([^>]+)>/)?.[1];
          socket.write("250 OK\r\n");
        } else if (linha === "DATA") {
          corpo = [];
          socket.write("354 End with dot\r\n");
        } else if (linha === "QUIT") socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  smtp.port = server.address().port;
  smtp.close = async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  };
  return smtp;
}
