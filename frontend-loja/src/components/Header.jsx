import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoja } from "../estado.jsx";
import { IconeBusca, IconeCoracao, IconeMenu, IconeSacola, IconeUsuario } from "../icons.jsx";

export default function Header({ onAbrirMenu }) {
  const { quantidadeTotal, favoritos } = useLoja();
  const navigate = useNavigate();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");

  function buscar(evento) {
    evento.preventDefault();
    const limpo = termo.trim();
    navigate(limpo ? `/catalogo?busca=${encodeURIComponent(limpo)}` : "/catalogo");
    setBuscaAberta(false);
  }

  return (
    <header className="cm-header">
      <div className="cm-header-inner">
        <Link to="/" className="cm-marca">
          <img src="/logo.png" alt="Charme Modas" />
          <span>
            <p className="cm-marca-nome">Charme Modas</p>
            <p className="cm-marca-slogan">Seu estilo, seu charme</p>
          </span>
        </Link>

        <button className="cm-icone-botao" onClick={onAbrirMenu} aria-label="Abrir menu">
          <IconeMenu />
        </button>

        <div className="cm-header-acoes">
          {buscaAberta ? (
            <form className="cm-header-busca" onSubmit={buscar}>
              <IconeBusca />
              <input
                autoFocus
                placeholder="Buscar por vestido, blusa, calça..."
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onBlur={() => !termo && setBuscaAberta(false)}
              />
            </form>
          ) : (
            <button
              className="cm-icone-botao"
              onClick={() => setBuscaAberta(true)}
              aria-label="Buscar produtos"
            >
              <IconeBusca />
            </button>
          )}
          <button
            className="cm-icone-botao"
            onClick={() => navigate("/favoritos")}
            aria-label="Meus favoritos"
          >
            <IconeCoracao />
            {favoritos.length > 0 && <span className="cm-contador">{favoritos.length}</span>}
          </button>
          <button
            className="cm-icone-botao"
            onClick={() => navigate("/carrinho")}
            aria-label="Meu carrinho"
          >
            <IconeSacola />
            {quantidadeTotal > 0 && <span className="cm-contador">{quantidadeTotal}</span>}
          </button>
          <button
            className="cm-icone-botao"
            onClick={() => navigate("/conta")}
            aria-label="Minha conta"
          >
            <IconeUsuario />
          </button>
        </div>
      </div>
    </header>
  );
}
