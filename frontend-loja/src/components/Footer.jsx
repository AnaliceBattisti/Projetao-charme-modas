import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="cm-rodape">
      <div className="cm-rodape-inner">
        <div>
          <p className="cm-rodape-marca">Charme Modas</p>
          <p className="cm-rodape-slogan">Seu estilo, seu charme.</p>
        </div>
        <div className="cm-rodape-links">
          <Link to="/informacoes/trocas">Trocas</Link>
          <span>•</span>
          <Link to="/informacoes/privacidade">Privacidade</Link>
          <span>•</span>
          <Link to="/informacoes/termos">Termos</Link>
          <span>•</span>
          <Link to="/contato">Contato</Link>
        </div>
      </div>
    </footer>
  );
}
