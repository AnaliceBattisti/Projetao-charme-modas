import { Link } from "react-router-dom";
import { imagemUrl } from "../api.js";
import { useLoja } from "../estado.jsx";
import { formatarPreco } from "../format.js";

export default function Carrinho() {
  const { itens, subtotal, alterarQuantidade, remover } = useLoja();

  if (itens.length === 0) {
    return (
      <div className="cm-pagina">
        <h1 className="cm-titulo-pagina">Seu carrinho</h1>
        <p className="cm-subtitulo-pagina">Ainda não tem nenhuma peça por aqui.</p>
        <div className="cm-vazio">
          <p>Que tal dar uma olhada no catálogo?</p>
          <Link to="/catalogo">
            <span className="cm-botao">Explorar catálogo</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cm-pagina">
      <h1 className="cm-titulo-pagina">Seu carrinho</h1>
      <p className="cm-subtitulo-pagina">
        {itens.length} {itens.length === 1 ? "peça" : "peças"} selecionada
        {itens.length === 1 ? "" : "s"}.
      </p>

      <div className="cm-carrinho">
        <section>
          {itens.map((item) => {
            const foto = imagemUrl(item.imagemUrl);
            return (
              <article className="cm-item" key={item.gradeId}>
                <Link
                  to={`/produto/${item.produtoId}`}
                  className="cm-item-imagem"
                  style={foto ? { backgroundImage: `url(${foto})` } : undefined}
                  aria-label={item.nome}
                />
                <div>
                  <h2 className="cm-item-nome">
                    <Link to={`/produto/${item.produtoId}`}>{item.nome}</Link>
                  </h2>
                  <p className="cm-item-variacao">
                    Tamanho {item.tamanho || "único"} • {item.cor || "cor única"}
                  </p>
                  <span className="cm-preco">{formatarPreco(item.precoUnitario)}</span>
                </div>
                <div className="cm-item-acoes">
                  <div className="cm-contador-qtd">
                    <button
                      onClick={() => alterarQuantidade(item.gradeId, -1)}
                      disabled={item.quantidade <= 1}
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span>{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(item.gradeId, 1)}
                      disabled={item.quantidade >= item.estoqueAtual}
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                  <br />
                  <button className="cm-remover" onClick={() => remover(item.gradeId)}>
                    Remover
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="cm-resumo">
          <h2>Resumo do pedido</h2>
          <div className="cm-resumo-linha">
            <span>Subtotal</span>
            <span>{formatarPreco(subtotal)}</span>
          </div>
          <div className="cm-resumo-linha">
            <span>Entrega ou retirada</span>
            <span>A combinar com a loja</span>
          </div>
          <div className="cm-resumo-total">
            <span>Total dos produtos</span>
            <span className="cm-preco">{formatarPreco(subtotal)}</span>
          </div>
          <div className="cm-resumo-acoes">
            <Link to="/checkout">
              <span className="cm-botao cm-botao-bloco">Revisar e enviar pedido</span>
            </Link>
            <Link to="/catalogo">
              <span className="cm-botao-claro cm-botao-bloco">Continuar comprando</span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
