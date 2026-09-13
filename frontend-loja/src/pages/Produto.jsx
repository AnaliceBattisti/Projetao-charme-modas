import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { imagemUrl } from "../api.js";
import { useLoja } from "../estado.jsx";
import { formatarPreco, parcelaSemJuros } from "../format.js";
import { useProdutos } from "../produtos.js";
import { IconeCheck } from "../icons.jsx";
import { corEhClara, corHex } from "../cores.js";

const GARANTIAS = [
  "Compra segura",
  "Pix, cartão e boleto",
  "Acompanhe o status do pedido",
  "Trocas conforme política da loja",
];

export default function Produto() {
  const { id } = useParams();
  const { produtos, carregando, erro } = useProdutos();
  const { adicionar } = useLoja();
  const navigate = useNavigate();

  const [tamanho, setTamanho] = useState(null);
  const [cor, setCor] = useState(null);
  const [imagemAtiva, setImagemAtiva] = useState(null);
  const [aviso, setAviso] = useState(null);

  const produto = produtos.find((p) => String(p.id) === id);

  // A cor é a variação; os tamanhos são as grades dentro dela.
  const cores = useMemo(
    () => (produto?.variacoes ?? []).map((v) => v.cor).filter(Boolean),
    [produto]
  );
  const variacaoSelecionada = useMemo(
    () => (produto?.variacoes ?? []).find((v) => v.cor === cor) ?? null,
    [produto, cor]
  );
  // Sem cor escolhida, mostramos todos os tamanhos que o produto tem.
  const tamanhos = useMemo(() => {
    const origem = variacaoSelecionada ? [variacaoSelecionada] : produto?.variacoes ?? [];
    return [...new Set(origem.flatMap((v) => (v.grades ?? []).map((g) => g.tamanho)))];
  }, [produto, variacaoSelecionada]);
  const fotos = useMemo(
    () => (produto?.variacoes ?? []).map((v) => v.imagemUrl).filter(Boolean),
    [produto]
  );

  if (carregando) return <div className="cm-pagina"><div className="cm-vazio">Carregando...</div></div>;
  if (erro) return <div className="cm-pagina"><p className="cm-erro">{erro}</p></div>;
  if (!produto) {
    return (
      <div className="cm-pagina">
        <div className="cm-vazio">
          <p>Peça não encontrada.</p>
          <Link to="/catalogo">
            <span className="cm-botao">Ver catálogo</span>
          </Link>
        </div>
      </div>
    );
  }

  // Escolher cor + tamanho resolve uma grade, que é o que se vende.
  const grade =
    variacaoSelecionada && tamanho
      ? (variacaoSelecionada.grades ?? []).find((g) => g.tamanho === tamanho) ?? null
      : null;

  // Uma cor está disponível se tiver qualquer grade com estoque (respeitando o
  // tamanho já escolhido); um tamanho está disponível dentro da cor escolhida.
  function corDisponivel(valorCor) {
    const variacao = produto.variacoes.find((v) => v.cor === valorCor);
    return (variacao?.grades ?? []).some(
      (g) => g.estoqueAtual > 0 && (!tamanho || g.tamanho === tamanho)
    );
  }

  function tamanhoDisponivel(valorTamanho) {
    const origem = variacaoSelecionada ? [variacaoSelecionada] : produto.variacoes;
    return origem.some((v) =>
      (v.grades ?? []).some((g) => g.tamanho === valorTamanho && g.estoqueAtual > 0)
    );
  }

  // A foto acompanha a cor escolhida.
  const capa = imagemUrl(imagemAtiva ?? variacaoSelecionada?.imagemUrl ?? fotos[0] ?? null);
  const semEstoque = !grade || grade.estoqueAtual <= 0;

  function aoAdicionar(irParaCarrinho) {
    if (!grade) {
      setAviso("Escolha a cor e o tamanho antes de adicionar.");
      return;
    }
    if (grade.estoqueAtual <= 0) {
      setAviso("Essa combinação está sem estoque.");
      return;
    }
    setAviso(null);
    adicionar({
      gradeId: grade.id,
      produtoId: produto.id,
      nome: produto.nome,
      cor: variacaoSelecionada.cor,
      tamanho: grade.tamanho,
      precoUnitario: Number(produto.precoVenda),
      imagemUrl: variacaoSelecionada.imagemUrl,
      estoqueAtual: grade.estoqueAtual,
    });
    if (irParaCarrinho) navigate("/carrinho");
  }

  return (
    <div className="cm-pagina">
      <p className="cm-migalhas">
        <Link to="/">Início</Link> / <Link to="/catalogo">{produto.categoria || "Catálogo"}</Link> /{" "}
        {produto.nome}
      </p>

      <div className="cm-produto">
        <div className="cm-produto-galeria">
          <div
            className="cm-produto-imagem"
            style={capa ? { backgroundImage: `url(${capa})` } : undefined}
          />
          {fotos.length > 1 && (
            <div className="cm-produto-miniaturas">
              {fotos.slice(0, 3).map((foto) => (
                <button
                  key={foto}
                  className={"cm-miniatura" + (imagemAtiva === foto ? " ativa" : "")}
                  style={{ backgroundImage: `url(${imagemUrl(foto)})` }}
                  onClick={() => setImagemAtiva(foto)}
                  aria-label="Ver foto"
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h1>{produto.nome}</h1>
          <p className="cm-produto-preco">{formatarPreco(produto.precoVenda)}</p>
          <p className="cm-produto-parcelas">
            até 3x de {parcelaSemJuros(produto.precoVenda)} sem juros
          </p>

          {produto.descricao && <p className="cm-produto-descricao">{produto.descricao}</p>}

          {tamanhos.length > 0 && (
            <>
              <span className="cm-campo-label">Tamanho</span>
              <div className="cm-opcoes" role="group" aria-label="Tamanho">
                {tamanhos.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    className={"cm-opcao-caixa" + (tamanho === valor ? " ativa" : "")}
                    aria-pressed={tamanho === valor}
                    disabled={tamanho !== valor && !tamanhoDisponivel(valor)}
                    onClick={() => {
                      setTamanho((atual) => atual === valor ? null : valor);
                      setAviso(null);
                    }}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </>
          )}

          {cores.length > 0 && (
            <>
              <span className="cm-campo-label">Cor</span>
              <div className="cm-opcoes" role="group" aria-label="Cor">
                {cores.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    className={"cm-opcao-caixa" + (cor === valor ? " ativa" : "")}
                    aria-pressed={cor === valor}
                    disabled={cor !== valor && !corDisponivel(valor)}
                    onClick={() => {
                      setCor((atual) => atual === valor ? null : valor);
                      setAviso(null);
                    }}
                  >
                    <span
                      className={
                        "cm-bolinha" +
                        (corHex(valor)
                          ? corEhClara(corHex(valor))
                            ? " cm-bolinha-clara"
                            : ""
                          : " cm-bolinha-desconhecida")
                      }
                      style={corHex(valor) ? { background: corHex(valor) } : undefined}
                    />
                    {valor}
                  </button>
                ))}
              </div>
            </>
          )}

          {aviso && <p className="cm-erro">{aviso}</p>}
          {grade && semEstoque && <p className="cm-erro">Essa combinação está esgotada.</p>}

          <div className="cm-produto-acoes">
            <button className="cm-botao" onClick={() => aoAdicionar(false)} disabled={semEstoque}>
              Adicionar ao carrinho
            </button>
            <button
              className="cm-botao-claro"
              onClick={() => aoAdicionar(true)}
              disabled={semEstoque}
            >
              Comprar agora
            </button>
          </div>

          <div className="cm-lista-garantias">
            <ul>
              {GARANTIAS.map((item) => (
                <li key={item}>
                  <IconeCheck />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
