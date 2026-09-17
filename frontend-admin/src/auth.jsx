import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

// Sessão de verdade, validada no backend: o painel não decide mais sozinho quem
// está logado. O cookie é httpOnly, então o JavaScript nunca vê o token — só
// pergunta ao servidor quem é o funcionário da vez.
const SessaoContext = createContext(null);

export function SessaoProvider({ children }) {
  const [funcionario, setFuncionario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .get("/painel/eu")
      .then((dados) => ativo && setFuncionario(dados.funcionario))
      .catch(() => ativo && setFuncionario(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  async function entrar(email, senha) {
    const dados = await api.post("/painel/login", { email, senha });
    setFuncionario(dados.funcionario);
    return dados.funcionario;
  }

  async function sair() {
    try {
      await api.post("/painel/logout", {});
    } finally {
      setFuncionario(null);
    }
  }

  const valor = {
    funcionario,
    carregando,
    entrar,
    sair,
    autenticado: Boolean(funcionario),
    ehAdmin: funcionario?.papel === "ADMIN",
  };

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao() {
  const contexto = useContext(SessaoContext);
  if (!contexto) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return contexto;
}
