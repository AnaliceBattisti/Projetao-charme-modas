import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function RedefinirSenha() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extrai o token de segurança do hash da URL (ex: #token=...)
  const [token, setToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("token") || ""
  );
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const retorno = useRef(null);
  
  // Valida se o token possui o formato esperado (ex: hash hex de 64 caracteres)
  const tokenValido = /^[a-f0-9]{64}$/.test(token);

  useEffect(() => {
    // Remove o token da barra de endereços/histórico por segurança logo após a leitura
    if (location.hash) {
      setToken(new URLSearchParams(location.hash.slice(1)).get("token") || "");
      setMensagem("");
      setConcluido(false);
      navigate("/redefinir-senha", { replace: true });
    }
  }, [location.hash, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (enviando || !tokenValido) return;

    const formulario = event.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));

    if (dados.senha !== dados.confirmacao) {
      setMensagem("As senhas precisam ser iguais.");
      requestAnimationFrame(() => retorno.current?.focus());
      return;
    }

    if (dados.senha.length < 8) {
      setMensagem("A senha deve ter pelo menos 8 caracteres.");
      requestAnimationFrame(() => retorno.current?.focus());
      return;
    }

    setEnviando(true);
    setMensagem("");

    try {
      const response = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: dados.senha, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao redefinir a senha.");
      }

      formulario.reset();
      setToken("");
      setConcluido(true);
      setMensagem(data.message || "Senha redefinida com sucesso!");
    } catch (err) {
      setMensagem(err.message);
      requestAnimationFrame(() => retorno.current?.focus());
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="cm-login-split">
      <div className="cm-login-form-side">
        <div className="cm-login-form-wrap">
          <img
            className="cm-logo-square"
            src="/logo.png"
            alt="Charme Modas"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <p className="cm-brand">Charme Modas</p>
          <p className="cm-login-subtitle">
            {concluido ? "Senha Alterada" : "Redefinição de Senha"}
          </p>

          {concluido ? (
            <div>
              <p
                ref={retorno}
                tabIndex={-1}
                role="status"
                style={{ color: "green", fontSize: "14px", marginTop: "15px", marginBottom: "20px" }}
              >
                {mensagem}
              </p>
              <Link className="cm-button" to="/login" style={{ display: "block", textAlign: "center", textDecoration: "none", lineHeight: "normal" }}>
                Ir para o Login →
              </Link>
            </div>
          ) : tokenValido ? (
            <form className="cm-login-form" onSubmit={handleSubmit} aria-busy={enviando}>
              <fieldset disabled={enviando} style={{ border: "none", padding: 0, margin: 0 }}>
                <label className="cm-label" htmlFor="senha">
                  Nova senha
                </label>
                <input
                  id="senha"
                  name="senha"
                  className="cm-input"
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />

                <label className="cm-label" htmlFor="confirmacao" style={{ marginTop: "15px" }}>
                  Confirmar nova senha
                </label>
                <input
                  id="confirmacao"
                  name="confirmacao"
                  className="cm-input"
                  type="password"
                  placeholder="Repita a nova senha"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />

                {mensagem && (
                  <p
                    ref={retorno}
                    tabIndex={-1}
                    role="alert"
                    style={{ color: "red", fontSize: "14px", marginTop: "10px" }}
                  >
                    {mensagem}
                  </p>
                )}

                <button className="cm-button" type="submit" style={{ marginTop: "20px" }}>
                  {enviando ? "Salvando..." : "Redefinir Senha →"}
                </button>
              </fieldset>
            </form>
          ) : (
            <div>
              <p
                ref={retorno}
                tabIndex={-1}
                role="alert"
                style={{ color: "red", fontSize: "14px", marginTop: "15px" }}
              >
                Link inválido ou expirado. Abra o link recebido por e-mail ou solicite um novo link.
              </p>
              <div style={{ marginTop: "20px", textAlign: "center" }}>
                <Link className="cm-link" to="/recuperar-senha">
                  ← Solicitar novo link de recuperação
                </Link>
              </div>
            </div>
          )}

          {!concluido && (
            <div style={{ marginTop: "30px", textAlign: "center" }}>
              <Link className="cm-link" to="/login">
                ← Voltar para o Login
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="cm-login-image-side">
        <div className="cm-login-image-overlay">
          <p className="cm-login-image-title">Segurança Avançada</p>
          <p className="cm-login-image-text">
            Atualize sua credencial administrativa com total proteção e validação de tokens.
          </p>
        </div>
      </div>
    </div>
  );
}