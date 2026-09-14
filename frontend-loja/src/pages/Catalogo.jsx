import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard.jsx";
import { categoriasDe, coresDe, ehNovidade, tamanhosDe, useProdutos } from "../produtos.js";
import { formatarPreco } from "../format.js";

export default function Catalogo() {
  const { produtos, carregando, erro } = useProdutos();
  const [parametros, setParametros] = useSearchParams();
  const [tamanho, setTamanho] = useState(null);
  const [cor, setCor] = useState(null);

  const categoriaDaUrl = parametros.get("categoria");
  const buscaDaUrl = (parametros.get("busca") ?? "").trim();
  const soNovidades = parametros.get("novidades") === "1";
  const categorias = categoriasDe(produtos);
  const tamanhos = tamanhosDe(produtos);
  const cores = coresDe(produtos);

  const precos = produtos.map((p) => Number(p.precoVenda));
  const faixa = precos.length
    ? { min: Math.min(...precos), max: Math.max(...precos) }
    : { min: 0, max: 0 };

  const filtrados = useMemo(() => {
    const termo = buscaDaUrl.toLowerCase();
    const lista = produtos.filter((produto) => {
      if (categoriaDaUrl && produto.categoria !== categoriaDaUrl) return false;
      if (tamanho && !produto.variacoes.some((v) => (v.grades ?? []).some((g) => g.tamanho === tamanho)))
        return false;
      if (cor && !produto.variacoes.some((v) => v.cor === cor)) return false;
      if (soNovidades && !ehNovidade(produto)) return false;
      if (termo) {
        const texto = [produto.nome, produto.marca, produto.categoria, produto.descricao]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
    // A API já devolve do mais novo pro mais antigo; em Novidades isso é o que importa.
    return lista;
  }, [produtos, categoriaDaUrl, tamanho, cor, buscaDaUrl, soNovidades]);

  function selecionarCategoria(valor) {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set("categoria", valor);
    else novos.delete("categoria");
    setParametros(novos);
  }

  function removerParametro(nome) {
    const novos = new URLSearchParams(parametros);
    novos.delete(nome);
    setParametros(novos);
  }

  function limparFiltros() {
    setTamanho(null);
    setCor(null);
    setParametros(new URLSearchParams());
  }

  return (
    <div className="cm-pagina">
      <h1 className="cm-titulo-pagina">{soNovidades ? "Novidades" : "Catálogo"}</h1>
      <p className="cm-subtitulo-pagina">
        {soNovidades
          ? "As peças que chegaram por último na loja."
          : "Encontre a peça perfeita para você."}
      </p>

      {erro && <p className="cm-erro">{erro}</p>}

      {(buscaDaUrl || soNovidades) && (
        <div className="cm-filtros-ativos">
          {buscaDaUrl && (
            <span className="cm-chip">
              Buscando por “{buscaDaUrl}”
              <button onClick={() => removerParametro("busca")} aria-label="Limpar busca">
                ×
              </button>
            </span>
          )}
          {soNovidades && (
            <span className="cm-chip">
              Só novidades
              <button onClick={() => removerParametro("novidades")} aria-label="Remover filtro">
                ×
              </button>
            </span>
          )}
        </div>
      )}

      <div className="cm-catalogo">
        <aside className="cm-filtros">
          <h2>Filtros</h2>

          <div className="cm-filtro-grupo">
            <h3>Categoria</h3>
            {categorias.length === 0 ? (
              <p className="cm-faixa-preco">Nenhuma categoria cadastrada.</p>
            ) : (
              categorias.map((categoria) => (
                <label key={categoria} className="cm-filtro-opcao">
                  <input
                    type="checkbox"
                    checked={categoriaDaUrl === categoria}
                    onChange={(e) => selecionarCategoria(e.target.checked ? categoria : null)}
                  />
                  {categoria}
                </label>
              ))
            )}
          </div>

          {tamanhos.length > 0 && (
            <div className="cm-filtro-grupo">
              <h3>Tamanho</h3>
              <div className="cm-tamanhos">
                {tamanhos.map((valor) => (
                  <button
                    key={valor}
                    className={"cm-pilula" + (tamanho === valor ? " ativa" : "")}
                    onClick={() => setTamanho(tamanho === valor ? null : valor)}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </div>
          )}

          {cores.length > 0 && (
            <div className="cm-filtro-grupo">
              <h3>Cor</h3>
              {cores.map((valor) => (
                <label key={valor} className="cm-filtro-opcao">
                  <input
                    type="radio"
                    name="cor"
                    checked={cor === valor}
                    onChange={() => setCor(valor)}
                  />
                  {valor}
                </label>
              ))}
            </div>
          )}

          <div className="cm-filtro-grupo">
            <h3>Preço</h3>
            <p className="cm-faixa-preco">
              {formatarPreco(faixa.min)} — {formatarPreco(faixa.max)}
            </p>
          </div>

          <button className="cm-botao-claro cm-botao-bloco" onClick={limparFiltros}>
            Limpar filtros
          </button>
        </aside>

        <section>
          {carregando ? (
            <div className="cm-vazio">Carregando peças...</div>
          ) : filtrados.length === 0 ? (
            <div className="cm-vazio">
              Nenhuma peça encontrada com esses filtros.
            </div>
          ) : (
            <div className="cm-grade">
              {filtrados.map((produto) => (
                <ProdutoCard key={produto.id} produto={produto} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
