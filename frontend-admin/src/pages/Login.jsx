export default function Login() {
  return (
    <div className="cm-login-page">
      <div className="cm-login-card">
        <img
          className="cm-logo"
          src="/logo.png"
          alt="Charme Modas"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <p className="cm-brand">Charme Modas</p>
        <p className="cm-tagline">Seu estilo. Seu charme.</p>
        <form onSubmit={(e) => e.preventDefault()}>
          <input className="cm-input" type="email" placeholder="E-mail" />
          <input className="cm-input" type="password" placeholder="Senha" />
          <button className="cm-button" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
