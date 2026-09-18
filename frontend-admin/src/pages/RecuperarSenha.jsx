import { useState } from "react";
import { Link } from "react-router-dom";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (!email) {
      return setErro("Por favor, preencha o e-mail cadastrado.");
    }

    setLoading(true);
  try {
    // Ajuste o caminho da URL caso sua rota no backend seja diferente
    const response = await fetch("/api/auth/admin/recuperar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ocorreu um erro ao solicitar a recuperação.");
    }

    setMensagem("Se o e-mail estiver correto, você receberá um link de recuperação em breve.");
  } catch (err) {
    setErro(err.message);
  } finally {
    setLoading(false);
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
          <p className="cm-login-subtitle">Recuperação de Senha do Painel</p>

          <form className="cm-login-form" onSubmit={handleSubmit}>
            <label className="cm-label" htmlFor="recuperar-email">
              E-mail da conta
            </label>
            <input
              id="recuperar-email"
              className="cm-input"
              type="email"
              placeholder="admin@charmemodas.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            {erro && <p style={{ color: "red", fontSize: "14px", marginTop: "10px" }}>{erro}</p>}
            {mensagem && <p style={{ color: "green", fontSize: "14px", marginTop: "10px" }}>{mensagem}</p>}

            <button className="cm-button"
            type="submit"
            style={{ marginTop: "20px" }}
            disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar instruções →"}
            </button>
          </form>

          <div style={{ marginTop: "30px", textAlign: "center" }}>
            <Link className="cm-link" to="/login">
              ← Voltar para o Login
            </Link>
          </div>
        </div>
      </div>

      <div className="cm-login-image-side">
        <div className="cm-login-image-overlay">
          <p className="cm-login-image-title">Acesso Seguro</p>
          <p className="cm-login-image-text">
            Recupere o acesso ao painel de gestão da Charme Modas.
          </p>
        </div>
      </div>
    </div>
  );
}