import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { situacao } from "../estoqueUtils.js";

export default function Dashboard() {
  const [produtos, setProdutos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [totalClientes, setTotalClientes] = useState(null);
  const [error, setError] = useState(null);

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
    (sum, v) => sum + v.estoqueAtual * Number(v.produto?.precoVenda || 0),
    0
  );
  const alertas = variacoes.filter((v) => situacao(v).label !== "Adequado");

  const indicadores = [
    { label: "Produtos cadastrados", valor: produtos.length },
    { label: "Itens em estoque", valor: itensEmEstoque },
    { label: "Clientes cadastrados", valor: totalClientes ?? "—" },
    { label: "Valor em estoque", valor: `R$ ${valorEmEstoque.toFixed(2)}` },
  ];

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
          <div className="cm-card" key={indicador.label}>
            <p>{indicador.label}</p>
            <strong>{indicador.valor}</strong>
          </div>
        ))}
      </div>

      <div className="cm-card">
        <h2 className="cm-section-title">Alertas de estoque</h2>
        {alertas.length === 0 ? (
          <p>Nenhum alerta — estoque adequado em todas as variações.</p>
        ) : (
          <table className="cm-table">
            <tbody>
              {alertas.map((v) => {
                const s = situacao(v);
                return (
                  <tr key={v.id}>
                    <td>
                      {v.produto.nome} · {v.cor || "—"}/{v.tamanho || "—"}
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
      </div>
    </div>
  );
}
