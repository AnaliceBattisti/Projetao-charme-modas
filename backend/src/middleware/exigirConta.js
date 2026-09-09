import { usuarioDaSessao } from "../lib/sessoes.js";

export async function exigirConta(req, res, next) {
  try {
    const usuario = await usuarioDaSessao(req);
    if (!usuario) {
      return res
        .status(401)
        .json({ error: "Entre na sua conta para continuar." });
    }
    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}
