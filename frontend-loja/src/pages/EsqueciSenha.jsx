import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import Campo from "../components/ui/Campo.jsx";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import { solicitarRecuperacaoSenha } from "../services/conta.js";

export default function EsqueciSenha() {
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const retorno = useRef(null);

  async function solicitar(event) {
    event.preventDefault();
    if (enviando) return;
    const dados = Object.fromEntries(new FormData(event.currentTarget));
    setEnviando(true);
    setMensagem("");
    try {
      const resposta = await solicitarRecuperacaoSenha(dados);
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
        titulo="Esqueci minha senha"
        descricao="Informe o e-mail que você usa para entrar na sua conta."
      />
      {!concluido && (
        <form onSubmit={solicitar} aria-busy={enviando}>
          <fieldset disabled={enviando}>
            <Campo
              label="E-mail de acesso"
              name="email"
              type="email"
              autoComplete="username"
              maxLength={254}
              required
              placeholder="seuemail@exemplo.com"
            />
            <div className="conta-botoes conta-acoes">
              <button className="cm-botao" type="submit">
                {enviando ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
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
      <Link to="/login" className="conta-link conta-voltar">
        Voltar para entrar
      </Link>
    </section>
  );
}
