import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Campo from "../components/ui/Campo.jsx";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import { redefinirSenhaConta } from "../services/conta.js";

export default function RedefinirSenha() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || "",
  );
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const retorno = useRef(null);
  const tokenValido = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    // Mantém o token apenas em memória, removendo-o da barra de endereço/histórico.
    if (location.hash) {
      setToken(new URLSearchParams(location.hash.slice(1)).get("token") || "");
      setMensagem("");
      setConcluido(false);
      navigate("/redefinir-senha", { replace: true });
    }
  }, [location.hash, navigate]);

  async function salvar(event) {
    event.preventDefault();
    if (enviando || !tokenValido) return;
    const formulario = event.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));
    if (dados.senha !== dados.confirmacao) {
      setMensagem("As senhas precisam ser iguais.");
      requestAnimationFrame(() => retorno.current?.focus());
      return;
    }
    setEnviando(true);
    setMensagem("");
    try {
      const resposta = await redefinirSenhaConta({ ...dados, token });
      formulario.reset();
      setToken("");
      setConcluido(true);
      setMensagem(resposta.mensagem);
    } catch (error) {
      setMensagem(error.message);
    } finally {
      setEnviando(false);
      requestAnimationFrame(() => retorno.current?.focus());
    }
  }

  return (
    <section className="conta-card conta-cadastro">
      <TituloPagina
        titulo={concluido ? "Senha alterada" : "Criar nova senha"}
        descricao={
          concluido
            ? "Sua conta está pronta para um novo acesso."
            : "Use uma senha de 8 a 128 caracteres e confirme abaixo."
        }
      />
      {!concluido &&
        (tokenValido ? (
          <form key={token} onSubmit={salvar} aria-busy={enviando}>
            <fieldset disabled={enviando}>
              <div className="conta-form-grid">
                <Campo
                  label="Nova senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
                <Campo
                  label="Confirmar nova senha"
                  name="confirmacao"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
              <div className="conta-botoes conta-acoes">
                <button type="submit" className="cm-botao">
                  {enviando ? "Salvando..." : "Salvar nova senha"}
                </button>
              </div>
            </fieldset>
          </form>
        ) : (
          <p className="conta-erro" role="alert">
            Abra o link recebido por e-mail ou solicite um novo link de
            recuperação.
          </p>
        ))}
      {mensagem && (
        <p
          ref={retorno}
          tabIndex={-1}
          role={concluido ? "status" : "alert"}
          className={concluido ? "conta-nota" : "conta-erro"}
        >
          {mensagem}
        </p>
      )}
      <div className="conta-botoes conta-acoes">
        <Link to="/login" className="cm-botao cm-botao-claro">
          Voltar para entrar
        </Link>
        {!concluido && (
          <Link to="/esqueci-senha" className="cm-botao cm-botao-claro">
            Solicitar novo link
          </Link>
        )}
      </div>
    </section>
  );
}
