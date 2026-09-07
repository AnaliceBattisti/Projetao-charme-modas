import { Link } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard.jsx";
import { imagemUrl } from "../api.js";
import { capaDe, useProdutos } from "../produtos.js";

export default function Home() {
  const { produtos, carregando, erro } = useProdutos();
  const destaques = produtos.slice(0, 4);
  const capaHero = imagemUrl(destaques.map(capaDe).find(Boolean));

  return (
    <div className="cm-pagina">
      <section className="cm-hero">
        <div>
          <h1>
            Moda que combina
            <br />
            com o seu charme.
          </h1>
          <p>Peças femininas para tornar cada momento mais especial.</p>
          <div className="cm-hero-acoes">
            <Link to="/catalogo">
              <span className="cm-botao">Ver coleção</span>
            </Link>
            <Link to="/catalogo?novidades=1">
              <span className="cm-botao-claro">Novidades</span>
            </Link>
          </div>
        </div>
        <div
          className="cm-hero-imagem"
          style={capaHero ? { backgroundImage: `url(${capaHero})` } : undefined}
        />
      </section>

      <section>
        <h2 className="cm-secao-titulo">Destaques da semana</h2>

        {erro && <p className="cm-erro">{erro}</p>}

        {carregando ? (
          <div className="cm-vazio">Carregando peças...</div>
        ) : destaques.length === 0 ? (
          <div className="cm-vazio">Nenhuma peça cadastrada ainda.</div>
        ) : (
          <div className="cm-grade">
            {destaques.map((produto, indice) => (
              <ProdutoCard key={produto.id} produto={produto} selo={indice < 2 ? "NOVO" : null} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
