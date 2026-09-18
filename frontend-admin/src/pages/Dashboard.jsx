import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { situacao } from "../estoqueUtils.js";
import { usePedidosPendentes } from "../pedidosPendentes.js";
import Paginacao from "../components/Paginacao.jsx";

const ALERTAS_POR_PAGINA = 10;

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [paginaAlertas, setPaginaAlertas] = useState(1);
  const [totalClientes, setTotalClientes] = useState(null);
  const [error, setError] = useState(null);
  const { total: pedidosPendentes, pedidos } = usePedidosPendentes();

  useEffect(() => {
    api.get("/produtos").then(setProdutos).catch((err) => setError(err.message));
    api.get("/estoque").then(setVariacoes).catch((err) => setError(err.message));
    api
      .get("/clientes")
      .then((clientes) => setTotalClientes(clientes.length))
      .catch(() => setTotalClientes(null));
  }, []);

  const itensEmEstoque = variacoes.reduce((sum, v) => sum + v.estoqueAtual, 0);
  const valorEmEstoque = variacoes.reduce(
    (sum, g) => sum + g.estoqueAtual * Number(g.variacao?.produto?.precoVenda || 0),
    0
  );
  const alertas = variacoes.filter((v) => situacao(v).label !== "Adequado");
  const totalPaginasAlertas = Math.max(1, Math.ceil(alertas.length / ALERTAS_POR_PAGINA));
  const paginaAtualAlertas = Math.min(paginaAlertas, totalPaginasAlertas);
  const alertasPaginados = alertas.slice(
    (paginaAtualAlertas - 1) * ALERTAS_POR_PAGINA,
    paginaAtualAlertas * ALERTAS_POR_PAGINA
  );

  const indicadores = [
    { label: "Pedidos aguardando", valor: pedidosPendentes, destaque: pedidosPendentes > 0 },
    { label: "Produtos cadastrados", valor: produtos.length },
    { label: "Itens em estoque", valor: itensEmEstoque },
    { label: "Clientes cadastrados", valor: totalClientes ?? "—" },
    { label: "Valor em estoque", valor: `R$ ${valorEmEstoque.toFixed(2)}` },
  ];

  const formatarData = (valor) => new Date(valor).toLocaleDateString("pt-BR");
  const diasEsperando = (valor) =>
    Math.floor((Date.now() - new Date(valor).getTime()) / 86_400_000);

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Dashboard</h1>
          <p className="cm-page-subtitle">Visão geral da loja: estoque, vendas e crediário.</p>
        </div>
      </div>

      {error && <p className="cm-error">{error}</p>}

      <div className="cm-card-grid">
        {indicadores.map((indicador) => (
          <div
            className={"cm-card" + (indicador.destaque ? " cm-card-destaque" : "")}
            key={indicador.label}
          >
            <p>{indicador.label}</p>
            <strong>{indicador.valor}</strong>
          </div>
        ))}
      </div>

      {/* Pedido da loja virtual não avisa ninguém sozinho: aparece aqui, do mais
          antigo para o mais novo, que é a ordem de quem está esperando há mais tempo. */}
      {pedidosPendentes > 0 && (
        <div className="cm-card cm-card-aviso" style={{ marginBottom: 20 }}>
          <h2 className="cm-section-title">
            {pedidosPendentes === 1
              ? "1 pedido da loja aguardando análise"
              : `${pedidosPendentes} pedidos da loja aguardando análise`}
          </h2>
          <table className="cm-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Recebido em</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const dias = diasEsperando(pedido.data);
                return (
                  <tr key={pedido.id}>
                    <td>
                      <strong>#{pedido.id}</strong>
                      <br />
                      <span className="cm-text-muted">
                        {pedido._count.itens} {pedido._count.itens === 1 ? "item" : "itens"}
                      </span>
                    </td>
                    <td>{pedido.cliente?.nome ?? "—"}</td>
                    <td>
                      {formatarData(pedido.data)}
                      {dias > 0 && (
                        <>
                          <br />
                          <span className={dias >= 2 ? "cm-text-error" : "cm-text-muted"}>
                            esperando há {dias} {dias === 1 ? "dia" : "dias"}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{pedido.formaPagamento === "CREDIARIO" ? "Crediário" : "À vista"}</td>
                    <td>R$ {Number(pedido.valorTotal).toFixed(2)}</td>
                    <td>
                      <Link className="cm-link" to="/compras">
                        Analisar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="cm-card">
        <h2 className="cm-section-title">Alertas de estoque</h2>
        {alertas.length === 0 ? (
          <p>Nenhum alerta — estoque adequado em todas as variações.</p>
        ) : (
          <table className="cm-table">
            <tbody>
              {alertasPaginados.map((v) => {
                const s = situacao(v);
                return (
                  <tr key={v.id}>
                    <td>
                      {v.variacao.produto.nome} · {v.variacao.cor} / {v.tamanho}
                    </td>
                    <td>
                      <span className={"cm-badge " + s.badge}>{s.label}</span>
                    </td>
                    <td>
                      <strong>{v.estoqueAtual} un</strong>
                    </td>
                    <td>
                      <Link className="cm-link" to="/estoque">
                        Repor
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Paginacao
          pagina={paginaAtualAlertas}
          totalItens={alertas.length}
          itensPorPagina={ALERTAS_POR_PAGINA}
          onMudarPagina={setPaginaAlertas}
          label="Paginação dos alertas de estoque"
        />
      </div>
    </div>
  );
}
