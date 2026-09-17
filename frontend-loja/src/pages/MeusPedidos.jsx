import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import { request, imagemUrl } from "../api.js";
import { linkWhatsApp, mensagemPedido } from "../data/loja.js";
import { formatarPreco } from "../format.js";
import "../styles/pedidos.css";

const formasPagamento = {
  CREDIARIO: "Crediário da loja",
  A_VISTA: "À vista — combinado com a loja",
  PIX: "Pix", DINHEIRO: "Dinheiro",
  CARTAO_CREDITO: "Cartão de crédito", CARTAO_DEBITO: "Cartão de débito",
};
const situacoes = {
  SOLICITADA: ["Aguardando aprovação", "aguardando"],
  PENDENTE: ["Pendente", "aguardando"],
  CONCLUIDA: ["Confirmado", "confirmado"],
  CANCELADA: ["Cancelado", "cancelado"],
};
const situacoesParcela = { PENDENTE: "Pendente", PAGA: "Paga", ATRASADA: "Atrasada", CANCELADA: "Cancelada" };
const formatarData = (value) => new Date(value).toLocaleDateString("pt-BR");
const pagamento = (value) => formasPagamento[value] || "A combinar com a loja";

function SituacaoPedido({ status }) {
  const [texto, classe] = situacoes[status] || ["Em acompanhamento", "aguardando"];
  return <span className={`cm-pedido-status ${classe}`}>{texto}</span>;
}

function ListaPedidos({ dados }) {
  return <>
    <p className="cm-pedidos-contagem">{dados.total} {dados.total === 1 ? "pedido registrado" : "pedidos registrados"}</p>
    <ol className="cm-meus-pedidos-lista">
      {dados.pedidos.map((pedido) => {
        const quantidade = pedido.itens.reduce((total, item) => total + item.quantidade, 0);
        const nomes = [...new Set(pedido.itens.map((item) => item.grade.variacao.produto.nome))];
        return <li key={pedido.id} className="conta-card cm-meu-pedido">
          <header className="cm-meu-pedido-cabecalho">
            <div><h2>Pedido #{pedido.id}</h2><time dateTime={pedido.data}>{formatarData(pedido.data)}</time></div>
            <SituacaoPedido status={pedido.status} />
          </header>
          <p className="cm-pedido-preview">{nomes.slice(0, 2).join(" · ")}{nomes.length > 2 ? ` e mais ${nomes.length - 2}` : ""}</p>
          <dl className="cm-pedido-resumo-dados">
            <div><dt>Itens</dt><dd>{quantidade} {quantidade === 1 ? "peça" : "peças"}</dd></div>
            <div><dt>Forma de pagamento</dt><dd>{pagamento(pedido.formaPagamento)}</dd></div>
            <div><dt>Total do pedido</dt><dd className="cm-pedido-valor">{formatarPreco(pedido.valorTotal)}</dd></div>
          </dl>
          <footer className="cm-meu-pedido-acoes">
            <Link className="cm-botao cm-botao-claro" to={`/meus-pedidos/${pedido.id}`} aria-label={`Ver detalhes do pedido #${pedido.id}`}>Ver detalhes →</Link>
          </footer>
        </li>;
      })}
    </ol>
    {dados.totalPaginas > 1 && <nav className="cm-pedidos-paginacao" aria-label="Páginas de pedidos">
      {dados.pagina > 1 ? <Link className="cm-botao cm-botao-claro" to={`/meus-pedidos?pagina=${dados.pagina - 1}`}>Anterior</Link> : <span />}
      <span>Página {dados.pagina} de {dados.totalPaginas}</span>
      {dados.pagina < dados.totalPaginas ? <Link className="cm-botao cm-botao-claro" to={`/meus-pedidos?pagina=${dados.pagina + 1}`}>Próxima</Link> : <span />}
    </nav>}
  </>;
}

function DetalhesPedido({ pedido }) {
  const crediario = pedido.formaPagamento === "CREDIARIO";
  const aguardando = pedido.status === "SOLICITADA";
  const cancelado = pedido.status === "CANCELADA";
  return <div className="cm-pedido-detalhes">
    <div className="cm-pedido-secoes">
      <section className="conta-card cm-pedido-secao" aria-labelledby="pedido-itens-titulo">
        <h2 id="pedido-itens-titulo">Itens do pedido</h2>
        <ul className="cm-pedido-produtos">
          {pedido.itens.map((item) => {
            const { grade } = item;
            const { variacao } = grade;
            const foto = imagemUrl(variacao.imagemUrl);
            return <li key={item.id}>
              <Link to={`/produto/${variacao.produto.id}`} className="cm-pedido-produto-imagem" aria-label={`Ver ${variacao.produto.nome} no catálogo`}>
                {foto && <img src={foto} alt="" loading="lazy" />}
              </Link>
              <div className="cm-pedido-produto-descricao">
                <h3><Link to={`/produto/${variacao.produto.id}`}>{variacao.produto.nome}</Link></h3>
                <p>Tamanho {grade.tamanho || "único"} · {variacao.cor || "Cor única"}</p>
                <p>Quantidade: {item.quantidade} · {formatarPreco(item.precoUnitario)} cada</p>
                <strong>{formatarPreco(item.quantidade * Number(item.precoUnitario))}</strong>
              </div>
            </li>;
          })}
        </ul>
      </section>
      <section className="conta-card cm-pedido-secao" aria-labelledby="pedido-pagamento-titulo">
        <h2 id="pedido-pagamento-titulo">Pagamento</h2>
        <p className="cm-pedido-pagamento-forma">{pagamento(pedido.formaPagamento)}</p>
        <p className="cm-pedido-explicacao">{cancelado
          ? "Este pedido foi cancelado. Fale com a loja se precisar de informações sobre os valores."
          : aguardando && crediario
            ? "Seu pedido aguarda análise da loja. O limite e as parcelas serão combinados antes da aprovação."
            : pedido.formaPagamento === "A_VISTA"
              ? "O pagamento à vista é combinado diretamente com a loja. Informe o número do pedido ao entrar em contato."
              : crediario && !pedido.parcelas.length
                ? "As condições do crediário ainda serão confirmadas pela loja."
                : crediario ? "Confira abaixo os valores, vencimentos e a situação das parcelas registradas pela loja."
                  : "Esta é a forma de pagamento registrada pela loja para o seu pedido."}</p>
        {crediario && pedido.parcelas.length > 0 && <div className="cm-pedido-parcelas" role="region" aria-label="Parcelas do crediário" tabIndex={0}>
          <table>
            <caption>Parcelas do crediário</caption>
            <thead><tr><th scope="col">Parcela</th><th scope="col">Vencimento</th><th scope="col">Valor</th><th scope="col">Situação</th></tr></thead>
            <tbody>{pedido.parcelas.map((parcela) => <tr key={parcela.numero}>
              <td>{parcela.numero} de {pedido.parcelas.length}</td>
              <td><time dateTime={parcela.dataVencimento}>{formatarData(parcela.dataVencimento)}</time></td>
              <td>{formatarPreco(parcela.valor)}</td><td>{situacoesParcela[parcela.status] || "Em acompanhamento"}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>
    <aside className="conta-card cm-pedido-secao cm-pedido-acompanhamento">
      <h2>Resumo do pedido</h2>
      <SituacaoPedido status={pedido.status} />
      <dl className="cm-pedido-resumo-dados">
        <div><dt>Data do pedido</dt><dd>{formatarData(pedido.data)}</dd></div>
        <div><dt>Forma de pagamento</dt><dd>{pagamento(pedido.formaPagamento)}</dd></div>
        <div><dt>Total do pedido</dt><dd className="cm-pedido-valor">{formatarPreco(pedido.valorTotal)}</dd></div>
      </dl>
      <p className="cm-pedido-explicacao">{cancelado ? "A solicitação foi encerrada pela loja."
        : aguardando ? "A equipe vai conferir a disponibilidade das peças e combinar a entrega ou retirada com você."
          : "Para acompanhar a entrega ou combinar a retirada, fale com a loja e informe o número do pedido."}</p>
      {/* Abre a conversa já com o número do pedido escrito: a cliente não precisa
          procurar o número nem explicar de onde veio. */}
      {linkWhatsApp(mensagemPedido(pedido.id))
        ? <a className="cm-botao cm-botao-bloco" href={linkWhatsApp(mensagemPedido(pedido.id))} target="_blank" rel="noreferrer">Falar com a loja no WhatsApp</a>
        : <Link className="cm-botao cm-botao-bloco" to="/contato">Falar com a loja</Link>}
    </aside>
  </div>;
}

export default function MeusPedidos() {
  const { pedidoId } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const pagina = params.get("pagina") || "1";
  const endpoint = pedidoId ? `/auth/me/pedidos/${encodeURIComponent(pedidoId)}` : `/auth/me/pedidos?pagina=${encodeURIComponent(pagina)}`;
  const [consulta, setConsulta] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const resultado = consulta?.endpoint === endpoint ? consulta : null;

  useEffect(() => {
    let ativo = true;
    setConsulta(null);
    request(endpoint).then((dados) => {
      if (ativo) setConsulta({ endpoint, dados });
    }).catch((erro) => {
      if (ativo) setConsulta({ endpoint, erro });
    });
    return () => { ativo = false; };
  }, [endpoint, tentativa]);

  const erro = resultado?.erro;
  const dados = resultado?.dados;
  return <div className="cm-pagina cm-meus-pedidos">
    <nav className="conta-migalhas" aria-label="Navegação dos pedidos">
      <Link to="/minha-conta">Minha conta</Link><span aria-hidden="true">/</span>
      {pedidoId ? <><Link to="/meus-pedidos">Meus pedidos</Link><span aria-hidden="true">/</span><span aria-current="page">Detalhes</span></>
        : <span aria-current="page">Meus pedidos</span>}
    </nav>
    <TituloPagina titulo={pedidoId && dados?.pedido ? `Pedido #${dados.pedido.id}` : pedidoId ? "Detalhes do pedido" : "Meus pedidos"}
      descricao={pedidoId ? "Confira suas peças, a situação do pedido e a forma de pagamento." : "Acompanhe seus pedidos e confira todos os detalhes em um só lugar."} />
    {!resultado ? <div className="conta-card cm-pedido-estado" role="status">Carregando {pedidoId ? "seu pedido" : "seus pedidos"}...</div>
      : erro ? <section className="conta-card cm-pedido-estado">
        {erro.status === 401 ? <>
          <h2>Entre para ver seus pedidos</h2><p>Acesse sua conta para acompanhar os pedidos feitos na Charme Modas.</p>
          <Link className="cm-botao" to="/login" state={{ voltarPara: location.pathname }}>Entrar na minha conta</Link>
        </> : <>
          <p role="alert">{erro.message}</p>
          <div className="conta-botoes">
            {![400, 404].includes(erro.status) && <button className="cm-botao" type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>}
            <Link className="cm-botao cm-botao-claro" to={pedidoId || pagina !== "1" ? "/meus-pedidos" : "/catalogo"}>{pedidoId || pagina !== "1" ? "Voltar aos meus pedidos" : "Explorar catálogo"}</Link>
          </div>
        </>}
      </section>
        : pedidoId ? <DetalhesPedido pedido={dados.pedido} />
          : dados.pedidos.length ? <ListaPedidos dados={dados} />
            : <section className="conta-card cm-pedido-estado">
              <h2>{dados.total ? "Nenhum pedido nesta página" : "Você ainda não tem pedidos"}</h2>
              <p>{dados.total ? "Volte à primeira página para consultar seu histórico." : "Encontre suas peças favoritas no catálogo e envie seu primeiro pedido para a loja."}</p>
              <Link className="cm-botao" to={dados.total ? "/meus-pedidos" : "/catalogo"}>{dados.total ? "Ver meus pedidos" : "Explorar catálogo"}</Link>
            </section>}
  </div>;
}
