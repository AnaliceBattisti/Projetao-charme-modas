import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (!novaSenha || novaSenha.length < 6) {
      return setErro("A nova senha deve ter pelo menos 6 caracteres.");
    }

    if (novaSenha !== confirmarSenha) {
      return setErro("As senhas não coincidem.");
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, novaSenha })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao redefinir a senha.");
      }

      setMensagem("Senha redefinida com sucesso! Redirecionando para o login...");
      setTimeout(() => navigate("/login"), 3000);
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
          <p className="cm-login-subtitle">Redefinição de Senha</p>

          <form className="cm-login-form" onSubmit={handleSubmit}>
            <label className="cm-label">E-mail da conta</label>
            <input
              className="cm-input"
              type="email"
              value={email}
              disabled
            />

            <label className="cm-label" style={{ marginTop: "15px" }}>Nova Senha</label>
            <input
              className="cm-input"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              disabled={loading}
            />

            <label className="cm-label" style={{ marginTop: "15px" }}>Confirmar Nova Senha</label>
            <input
              className="cm-input"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              disabled={loading}
            />

            {erro && <p style={{ color: "red", fontSize: "14px", marginTop: "10px" }}>{erro}</p>}
            {mensagem && <p style={{ color: "green", fontSize: "14px", marginTop: "10px" }}>{mensagem}</p>}

            <button className="cm-button" type="submit" style={{ marginTop: "20px" }} disabled={loading}>
              {loading ? "Salvando..." : "Redefinir Senha →"}
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
          <p className="cm-login-image-title">Nova Credencial</p>
          <p className="cm-login-image-text">
            Defina uma nova senha segura para gerenciar o painel administrativo.
          </p>
        </div>
      </div>
    </div>
  );
}