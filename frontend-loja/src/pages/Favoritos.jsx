import { Link } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard.jsx";
import { useLoja } from "../estado.jsx";
import { useProdutos } from "../produtos.js";

export default function Favoritos() {
  const { favoritos } = useLoja();
  const { produtos, carregando, erro } = useProdutos();
  const salvos = produtos.filter((p) => favoritos.includes(p.id));

  return (
    <div className="cm-pagina">
      <h1 className="cm-titulo-pagina">Meus favoritos</h1>
      <p className="cm-subtitulo-pagina">Seus produtos salvos em um só lugar.</p>

      {erro && <p className="cm-erro">{erro}</p>}

      {carregando ? (
        <div className="cm-vazio">Carregando...</div>
      ) : salvos.length === 0 ? (
        <div className="cm-vazio">
          <p>Você ainda não salvou nenhuma peça.</p>
          <Link to="/catalogo">
            <span className="cm-botao">Explorar catálogo</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="cm-grade">
            {salvos.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>

          <section className="cm-chamada">
            <div>
              <h2 className="cm-secao-titulo">Quer encontrar mais peças?</h2>
              <p>Explore o catálogo completo e salve seus preferidos no coração.</p>
            </div>
            <Link to="/catalogo">
              <span className="cm-botao">Explorar catálogo</span>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
