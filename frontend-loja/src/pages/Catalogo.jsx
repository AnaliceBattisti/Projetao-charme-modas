import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ProdutoCard from "../components/ProdutoCard.jsx";
import { categoriasDe, coresDe, ehNovidade, tamanhosDe, useProdutos } from "../produtos.js";
import { corEhClara, corHex } from "../cores.js";
import { formatarPreco } from "../format.js";

// Todo filtro mora na URL: o botão voltar funciona e dá pra mandar o link pronto.
function numeroOuNulo(valor) {
  const numero = Number(String(valor).replace(",", "."));
  return valor && !Number.isNaN(numero) ? numero : null;
}

export default function Catalogo() {
  const { produtos, carregando, erro } = useProdutos();
  const [parametros, setParametros] = useSearchParams();

  const categoriaDaUrl = parametros.get("categoria");
  const buscaDaUrl = (parametros.get("busca") ?? "").trim();
  const soNovidades = parametros.get("novidades") === "1";
  const tamanho = parametros.get("tamanho");
  const cor = parametros.get("cor");
  const precoMin = parametros.get("precoMin") ?? "";
  const precoMax = parametros.get("precoMax") ?? "";

  const categorias = categoriasDe(produtos);
  const tamanhos = tamanhosDe(produtos);
  const cores = coresDe(produtos);

  const precos = produtos.map((p) => Number(p.precoVenda));
  const faixa = precos.length
    ? { min: Math.min(...precos), max: Math.max(...precos) }
    : { min: 0, max: 0 };

  const filtrados = useMemo(() => {
    const termo = buscaDaUrl.toLowerCase();
    const min = numeroOuNulo(precoMin);
    const max = numeroOuNulo(precoMax);

    return produtos.filter((produto) => {
      if (categoriaDaUrl && produto.categoria !== categoriaDaUrl) return false;

      // Cor e tamanho precisam existir na MESMA variação: o tamanho mora dentro
      // da cor, então "Verde + G" só vale se houver grade G na cor verde.
      if (cor || tamanho) {
        const combina = produto.variacoes.some((v) => {
          if (cor && v.cor !== cor) return false;
          if (tamanho && !(v.grades ?? []).some((g) => g.tamanho === tamanho)) return false;
          return true;
        });
        if (!combina) return false;
      }

      const preco = Number(produto.precoVenda);
      if (min !== null && preco < min) return false;
      if (max !== null && preco > max) return false;

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
  }, [produtos, categoriaDaUrl, tamanho, cor, precoMin, precoMax, buscaDaUrl, soNovidades]);

  function definirParametro(nome, valor, { substituir = false } = {}) {
    const novos = new URLSearchParams(parametros);
    if (valor) novos.set(nome, valor);
    else novos.delete(nome);
    setParametros(novos, { replace: substituir });
  }

  // Clicar de novo na opção já escolhida desliga o filtro.
  function alternarParametro(nome, valor, atual) {
    definirParametro(nome, atual === valor ? null : valor);
  }

  function limparFiltros() {
    setParametros(new URLSearchParams());
  }

  const temFiltro =
    categoriaDaUrl || tamanho || cor || precoMin || precoMax || buscaDaUrl || soNovidades;

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
              <button onClick={() => definirParametro("busca", null)} aria-label="Limpar busca">
                ×
              </button>
            </span>
          )}
          {soNovidades && (
            <span className="cm-chip">
              Só novidades
              <button onClick={() => definirParametro("novidades", null)} aria-label="Remover filtro">
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
              <div className="cm-tamanhos">
                {categorias.map((valor) => (
                  <button
                    key={valor}
                    className={"cm-pilula" + (categoriaDaUrl === valor ? " ativa" : "")}
                    aria-pressed={categoriaDaUrl === valor}
                    onClick={() => alternarParametro("categoria", valor, categoriaDaUrl)}
                  >
                    {valor}
                  </button>
                ))}
              </div>
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
                    aria-pressed={tamanho === valor}
                    onClick={() => alternarParametro("tamanho", valor, tamanho)}
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
              <div className="cm-tamanhos">
                {cores.map((valor) => {
                  const hex = corHex(valor);
                  return (
                    <button
                      key={valor}
                      className={"cm-pilula cm-pilula-cor" + (cor === valor ? " ativa" : "")}
                      aria-pressed={cor === valor}
                      onClick={() => alternarParametro("cor", valor, cor)}
                    >
                      <span
                        className={
                          "cm-bolinha" +
                          (hex ? (corEhClara(hex) ? " cm-bolinha-clara" : "") : " cm-bolinha-desconhecida")
                        }
                        style={hex ? { background: hex } : undefined}
                      />
                      {valor}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cm-filtro-grupo">
            <h3>Preço</h3>
            <div className="cm-preco-campos">
              <input
                className="cm-preco-campo"
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={`De ${faixa.min.toFixed(0)}`}
                aria-label="Preço mínimo"
                value={precoMin}
                onChange={(e) => definirParametro("precoMin", e.target.value, { substituir: true })}
              />
              <span>—</span>
              <input
                className="cm-preco-campo"
                type="number"
                min="0"
                inputMode="decimal"
                placeholder={`Até ${faixa.max.toFixed(0)}`}
                aria-label="Preço máximo"
                value={precoMax}
                onChange={(e) => definirParametro("precoMax", e.target.value, { substituir: true })}
              />
            </div>
            <p className="cm-faixa-preco">
              A loja tem peças de {formatarPreco(faixa.min)} a {formatarPreco(faixa.max)}.
            </p>
          </div>

          <button
            className="cm-botao-claro cm-botao-bloco"
            onClick={limparFiltros}
            disabled={!temFiltro}
          >
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
