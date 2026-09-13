import { useState } from "react";
import { Link } from "react-router-dom";
import Campo from "../components/ui/Campo.jsx";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import { cadastrarConta } from "../services/conta.js";
import { formatCpf, formatTelefoneInput } from "../format.js";

export default function Cadastro() {
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  async function cadastrar(event) {
    event.preventDefault();
    if (enviando) return;
    const formulario = event.currentTarget;
    const dados = new FormData(formulario);
    setErroConfirmacao(false);
    if (dados.get("senha") !== dados.get("confirmacao")) {
      setErro(true);
      setErroConfirmacao(true);
      setMensagem("As senhas precisam ser iguais.");
      return;
    }
    setErro(false);
    setMensagem("");
    setEnviando(true);
    try {
      await cadastrarConta(Object.fromEntries(dados));
      formulario.reset();
      setConcluido(true);
    } catch (error) {
      setErro(true);
      setMensagem(error.message);
    } finally {
      setEnviando(false);
    }
  }
  if (concluido)
    return (
      <section className="conta-card conta-cadastro">
        <TituloPagina
          titulo="Conta criada com sucesso!"
          descricao="Seu cadastro na Charme Modas está pronto."
        />
        <p role="status">
          Agora você pode entrar usando seu e-mail e sua senha.
        </p>
        <Link to="/login" className="cm-botao">
          Entrar na minha conta
        </Link>
      </section>
    );
  return (
    <section className="conta-card conta-cadastro">
      <TituloPagina
        titulo="Criar sua conta"
        descricao="Cadastre-se para salvar favoritos e acompanhar suas compras."
      />
      <form onSubmit={cadastrar} aria-busy={enviando}>
        <fieldset disabled={enviando}>
          <div className="conta-form-grid">
            <Campo
              label="Nome completo"
              name="nome"
              placeholder="Seu nome"
              autoComplete="name"
              required
              minLength={3}
              maxLength={120}
            />
            <Campo
              label="E-mail"
              name="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              required
            />
            <Campo
              label="Telefone"
              name="telefone"
              mascara={formatTelefoneInput}
              type="tel"
              placeholder="(87) 99999-9999"
              autoComplete="tel"
              required
              pattern="\([0-9]{2}\) [0-9]{4,5}-[0-9]{4}"
              title="Informe o telefone com DDD e 10 ou 11 dígitos."
              maxLength={20}
            />
            <Campo
              label="CPF"
              name="cpf"
              mascara={formatCpf}
              placeholder="000.000.000-00"
              inputMode="numeric"
              pattern="[0-9]{3}\.?[0-9]{3}\.?[0-9]{3}-?[0-9]{2}"
              title="Informe os 11 dígitos do CPF, com ou sem pontuação."
              required
              maxLength={14}
            />
            <Campo
              label="Senha"
              name="senha"
              type="password"
              placeholder="Crie uma senha"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
            <Campo
              label="Confirmar senha"
              name="confirmacao"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              aria-invalid={erroConfirmacao || undefined}
              aria-describedby={
                erroConfirmacao ? "cadastro-mensagem" : undefined
              }
            />
          </div>
          <label className="conta-check conta-termos">
            <input type="checkbox" required />
            <span>
              Li e aceito os <Link to="/informacoes/termos">termos de uso</Link>{" "}
              e a{" "}
              <Link to="/informacoes/privacidade">política de privacidade</Link>
              .
            </span>
          </label>
          {mensagem && (
            <p
              id="cadastro-mensagem"
              className={erro ? "conta-erro" : "conta-nota"}
              role={erro ? "alert" : "status"}
            >
              {mensagem}
            </p>
          )}
          <div className="conta-form-grid">
            <button className="cm-botao" type="submit">
              {enviando ? "Criando conta..." : "Criar conta"}
            </button>
            <Link to="/login" className="cm-botao cm-botao-claro">
              Já tenho conta • Entrar
            </Link>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
