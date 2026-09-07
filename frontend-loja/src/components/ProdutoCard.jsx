import { Link } from "react-router-dom";
import { imagemUrl } from "../api.js";
import { useLoja } from "../estado.jsx";
import { formatarPreco } from "../format.js";
import { capaDe, estoqueDe } from "../produtos.js";
import { IconeCoracao } from "../icons.jsx";

export default function ProdutoCard({ produto, selo }) {
  const { ehFavorito, alternarFavorito } = useLoja();
  const capa = imagemUrl(capaDe(produto));
  const esgotado = estoqueDe(produto) <= 0;
  const favorito = ehFavorito(produto.id);

  return (
    <article className="cm-card">
      <Link
        to={`/produto/${produto.id}`}
        className="cm-card-imagem"
        style={capa ? { backgroundImage: `url(${capa})` } : undefined}
        aria-label={produto.nome}
      >
        {esgotado ? (
          <span className="cm-selo">ESGOTADO</span>
        ) : (
          selo && <span className="cm-selo">{selo}</span>
        )}
      </Link>

      <h3 className="cm-card-nome">
        <Link to={`/produto/${produto.id}`}>{produto.nome}</Link>
      </h3>

      <div className="cm-card-linha">
        <span className="cm-preco">{formatarPreco(produto.precoVenda)}</span>
        <button
          className="cm-coracao"
          onClick={() => alternarFavorito(produto.id)}
          aria-label={favorito ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-pressed={favorito}
        >
          <IconeCoracao preenchido={favorito} />
        </button>
      </div>

      <div className="cm-card-rodape">
        <Link to={`/produto/${produto.id}`}>
          <span className="cm-botao-claro cm-botao-bloco">Ver produto</span>
        </Link>
      </div>
    </article>
  );
}
