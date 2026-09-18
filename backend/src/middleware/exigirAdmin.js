import { adminDaSessao } from "../lib/sessoes.js";

export const exigirAdmin = async (req, res, next) => {
  try {
    const admin = await adminDaSessao(req);
    if (!admin) {
      return res.status(401).json({ error: "Acesso negado. Privilégios de administrador necessários." });
    }
    req.admin = admin; // Disponibiliza os dados do admin para as rotas seguintes
    next();
  } catch (error) {
    next(error);
  }
};