import { Link } from "react-router-dom";

export default function EmBreve({ titulo, subtitulo, descricao }) {
  return (
    <div className="cm-pagina">
      <h1 className="cm-titulo-pagina">{titulo}</h1>
      <p className="cm-subtitulo-pagina">{subtitulo}</p>
      <div className="cm-vazio">
        <p>{descricao}</p>
        <Link to="/catalogo">
          <span className="cm-botao-claro">Voltar ao catálogo</span>
        </Link>
      </div>
    </div>
  );
}
