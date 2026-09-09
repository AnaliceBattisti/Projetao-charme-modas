import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Campo from "../components/ui/Campo.jsx";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import {
  consultarConta,
  entrarNaConta,
  sairDaConta,
} from "../services/conta.js";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    let ativo = true;
    consultarConta()
      .then((data) => {
        if (ativo) setUsuario(data.usuario);
      })
      .catch((error) => {
        if (ativo && error.status !== 401) {
          setErro(true);
          setMensagem(error.message);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);
  async function entrar(event) {
    event.preventDefault();
    if (enviando) return;
    const formulario = event.currentTarget;
    setEnviando(true);
    setMensagem("");
    setErro(false);
    try {
      const data = await entrarNaConta(
        Object.fromEntries(new FormData(formulario)),
      );
      formulario.reset();
      setUsuario(data.usuario);
      if (location.state?.voltarPara === "/minha-conta/editar") {
        navigate("/minha-conta/editar", { replace: true });
      }
    } catch (error) {
      setErro(true);
      setMensagem(error.message);
    } finally {
      setEnviando(false);
    }
  }
  async function sair() {
    setEnviando(true);
    setMensagem("");
    setErro(false);
    try {
      await sairDaConta();
      setUsuario(null);
    } catch (error) {
      setErro(true);
      setMensagem(error.message);
    } finally {
      setEnviando(false);
    }
  }
  if (carregando)
    return (
      <section className="conta-card conta-informacoes">
        <TituloPagina titulo="Minha conta" />
        <p role="status">Carregando sua conta...</p>
      </section>
    );
  if (usuario)
    return (
      <section className="conta-card conta-informacoes">
        <TituloPagina
          titulo="Minha conta"
          descricao={`Olá, ${usuario.cliente.nome}!`}
        />
        <dl className="conta-dados">
          <div>
            <dt>Nome</dt>
            <dd>{usuario.cliente.nome}</dd>
          </div>
          <div>
            <dt>E-mail de acesso</dt>
            <dd>{usuario.email}</dd>
          </div>
          <div>
            <dt>Telefone</dt>
            <dd>{usuario.cliente.telefone || "Não informado"}</dd>
          </div>
        </dl>
        <div className="conta-botoes">
          <Link className="cm-botao" to="/minha-conta/editar">
            Editar meus dados
          </Link>
          <Link className="cm-botao cm-botao-claro" to="/catalogo">
            Continuar comprando
          </Link>
          <Link className="cm-botao cm-botao-claro" to="/favoritos">
            Meus favoritos
          </Link>
          <button
            type="button"
            className="cm-botao cm-botao-claro"
            disabled={enviando}
            onClick={sair}
          >
            {enviando ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
        {mensagem && (
          <p className="conta-erro" role="alert">
            {mensagem}
          </p>
        )}
      </section>
    );
  return (
    <div className="conta-login">
      <section className="conta-login-apresentacao">
        <span className="conta-logo-grande">
          <img
            src="/logo.png"
            alt="Logo Charme Modas"
            width="290"
            height="290"
          />
        </span>
        <h2>Sua conta Charme Modas</h2>
        <p>Acompanhe pedidos, salve favoritos e agilize suas compras.</p>
        <ul>
          <li>✓ Histórico de pedidos</li>
          <li>✓ Produtos favoritos</li>
          <li>✓ Endereços salvos</li>
        </ul>
      </section>
      <section className="conta-card conta-login-form">
        <TituloPagina
          titulo="Entrar"
          descricao="Acesse sua conta para continuar."
        />
        <form onSubmit={entrar} aria-busy={enviando}>
          <fieldset disabled={enviando}>
            <Campo
              label="E-mail"
              type="email"
              name="email"
              placeholder="seuemail@exemplo.com"
              autoComplete="username"
              required
            />
            <Campo
              label="Senha"
              type="password"
              name="senha"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={128}
            />
            <button
              type="button"
              className="conta-link conta-esqueceu"
              onClick={() => {
                setErro(false);
                setMensagem(
                  "A recuperação automática de senha ainda não está disponível. Entre em contato com a loja para obter ajuda.",
                );
              }}
            >
              Esqueci minha senha
            </button>
            <button type="submit" className="cm-botao">
              {enviando ? "Entrando..." : "Entrar"}
            </button>
          </fieldset>
        </form>
        {mensagem && (
          <p
            className={erro ? "conta-erro" : "conta-nota"}
            role={erro ? "alert" : "status"}
          >
            {mensagem}
          </p>
        )}
        <p className="conta-login-cadastro">Ainda não tem uma conta?</p>
        <Link className="cm-botao cm-botao-claro" to="/cadastro">
          Criar conta
        </Link>
        <Link className="conta-link conta-continuar" to="/catalogo">
          Continuar sem login
        </Link>
      </section>
    </div>
  );
}
