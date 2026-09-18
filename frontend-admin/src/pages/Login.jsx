import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSessao } from "../auth.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { entrar, autenticado, carregando } = useSessao();
  const navigate = useNavigate();

  useEffect(() => {
    if (!carregando && autenticado) {
      navigate("/", { replace: true });
    }
  }, [autenticado, carregando, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (!email || !senha) {
      return setErro("Por favor, preencha o e-mail e a senha.");
    }

    setLoading(true);
    try {
      await entrar(email, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err.message || "Não foi possível entrar.");
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
          <p className="cm-login-subtitle">Painel administrativo · Bem-vinda de volta</p>

          <form className="cm-login-form" onSubmit={handleSubmit}>
            <label className="cm-label" htmlFor="login-email">
              E-mail ou usuário
            </label>
            <input
              id="login-email"
              className="cm-input"
              type="text"
              placeholder="admin@charmemodas.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || carregando}
            />

            <div className="cm-label-row">
              <label className="cm-label" htmlFor="login-password">
                Senha
              </label>
              <Link className="cm-link" to="/recuperar-senha">
                Esqueci minha senha
              </Link>
            </div>

            <div className="cm-password-wrap">
              <input
                id="login-password"
                className="cm-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading || carregando}
              />
              <button
                type="button"
                className="cm-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            {erro && (
              <p role="alert" style={{ color: "red", fontSize: "14px", marginTop: "10px" }}>
                {erro}
              </p>
            )}

            <button className="cm-button" type="submit" disabled={loading || carregando}>
              {loading ? "Entrando..." : carregando ? "Carregando..." : "Entrar →"}
            </button>
          </form>

          <p className="cm-login-footnote">
            Loja física em Garanhuns-PE · Gestão de estoque, vendas e crediário
          </p>
        </div>
      </div>

      <div className="cm-login-image-side">
        <div className="cm-login-image-overlay">
          <p className="cm-login-image-title">Elegância em cada detalhe</p>
          <p className="cm-login-image-text">
            Vestuário feminino, masculino, infantil e acessórios. Gerencie toda a sua loja em
            um só lugar.
          </p>
        </div>
      </div>
    </div>
  );
}
