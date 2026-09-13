import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { imagemUrl } from "../api.js";
import { useLoja } from "../estado.jsx";
import { formatarPreco, parcelaSemJuros } from "../format.js";
import { useProdutos } from "../produtos.js";
import { IconeCheck } from "../icons.jsx";

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

  const tamanhos = useMemo(
    () => [...new Set((produto?.variacoes ?? []).map((v) => v.tamanho).filter(Boolean))],
    [produto]
  );
  const cores = useMemo(
    () => [...new Set((produto?.variacoes ?? []).map((v) => v.cor).filter(Boolean))],
    [produto]
  );
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

  // A variação só é definida quando os eixos disponíveis foram escolhidos.
  const selecaoCompleta = (!tamanhos.length || tamanho !== null) && (!cores.length || cor !== null);
  const combinacoes = produto.variacoes.filter(
    (v) => (!tamanhos.length || v.tamanho === tamanho) && (!cores.length || v.cor === cor)
  );
  const variacao = selecaoCompleta
    ? combinacoes.find((v) => v.estoqueAtual > 0) ?? combinacoes[0]
    : undefined;

  function disponivel(campo, valor) {
    return produto.variacoes.some((v) => {
      if (v[campo] !== valor || !(v.estoqueAtual > 0)) return false;
      if (campo === "tamanho" && cor) return v.cor === cor;
      if (campo === "cor" && tamanho) return v.tamanho === tamanho;
      return true;
    });
  }

  const capa = imagemUrl(imagemAtiva ?? variacao?.imagemUrl ?? fotos[0] ?? null);
  const semEstoque = !variacao || variacao.estoqueAtual <= 0;

  function aoAdicionar(irParaCarrinho) {
    if (!variacao) {
      setAviso("Escolha tamanho e cor antes de adicionar.");
      return;
    }
    if (variacao.estoqueAtual <= 0) {
      setAviso("Essa combinação está sem estoque.");
      return;
    }
    setAviso(null);
    adicionar({
      variacaoId: variacao.id,
      produtoId: produto.id,
      nome: produto.nome,
      cor: variacao.cor,
      tamanho: variacao.tamanho,
      precoUnitario: Number(produto.precoVenda),
      imagemUrl: variacao.imagemUrl,
      estoqueAtual: variacao.estoqueAtual,
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
                    disabled={tamanho !== valor && !disponivel("tamanho", valor)}
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
                    disabled={cor !== valor && !disponivel("cor", valor)}
                    onClick={() => {
                      setCor((atual) => atual === valor ? null : valor);
                      setAviso(null);
                    }}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </>
          )}

          {aviso && <p className="cm-erro">{aviso}</p>}
          {variacao && semEstoque && <p className="cm-erro">Essa combinação está esgotada.</p>}

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
