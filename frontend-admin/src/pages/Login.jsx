import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../auth.js";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    login();
    navigate("/", { replace: true });
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
            />

            <div className="cm-label-row">
              <label className="cm-label" htmlFor="login-password">
                Senha
              </label>
              <a className="cm-link" href="#">
                Esqueci minha senha
              </a>
            </div>
            <div className="cm-password-wrap">
              <input
                id="login-password"
                className="cm-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
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

            <button className="cm-button" type="submit">
              Entrar →
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
