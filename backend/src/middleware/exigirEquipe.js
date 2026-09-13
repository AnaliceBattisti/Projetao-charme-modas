import { funcionarioDaSessao } from "../lib/sessoesPainel.js";

/** Qualquer pessoa da equipe (ADMIN ou OPERADOR). */
export async function exigirEquipe(req, res, next) {
  const funcionario = await funcionarioDaSessao(req);
  if (!funcionario) {
    return res.status(401).json({ error: "Entre no painel para continuar." });
  }
  req.funcionario = funcionario;
  next();
}

/** Só quem administra: gerenciar a própria equipe. */
export async function exigirAdmin(req, res, next) {
  const funcionario = await funcionarioDaSessao(req);
  if (!funcionario) {
    return res.status(401).json({ error: "Entre no painel para continuar." });
  }
  if (funcionario.papel !== "ADMIN") {
    return res.status(403).json({
      error: "Só quem tem perfil de administrador pode gerenciar a equipe.",
    });
  }
  req.funcionario = funcionario;
  next();
}
