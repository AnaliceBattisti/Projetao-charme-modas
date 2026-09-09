export function limitarTentativas({
  limite = 30,
  janelaMs = 15 * 60 * 1000,
} = {}) {
  const tentativas = new Map();
  return (req, res, next) => {
    const agora = Date.now();
    for (const [ip, registro] of tentativas) {
      if (registro.expiraEm <= agora) tentativas.delete(ip);
    }
    const registro = tentativas.get(req.ip) || {
      quantidade: 0,
      expiraEm: agora + janelaMs,
    };
    if (
      registro.quantidade >= limite ||
      (!tentativas.has(req.ip) && tentativas.size >= 10000)
    ) {
      res.set(
        "Retry-After",
        String(Math.ceil((registro.expiraEm - agora) / 1000)),
      );
      return res
        .status(429)
        .json({
          error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        });
    }
    registro.quantidade += 1;
    tentativas.set(req.ip, registro);
    next();
  };
}
