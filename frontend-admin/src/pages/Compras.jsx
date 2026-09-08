import { useEffect, useState } from "react";
import { api } from "../api";
import { IconPlus, IconSearch } from "../icons";
import { useNavigate } from "react-router-dom";

export default function Compras() {
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [compras, setCompras] = useState([]);
  const navigate = useNavigate();

  const intlCurr = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function loadAll() {
    setLoading(true);
    setErrorFetch(false);

    let url = "/compras";
    const params = new URLSearchParams();
    if (busca) params.append("busca", busca);
    if (statusFiltro !== "TODOS") params.append("status", statusFiltro);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    api
      .get(url)
      .then((response) => {
        setCompras(Array.isArray(response) ? response : []);
      })
      .catch(() => {
        setErrorFetch(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [statusFiltro]);
  useEffect(loadAll, [busca]);

  const STATUS_BADGE = {
    CONCLUIDA: "cm-badge-green",
    PENDENTE: "cm-badge-yellow",
    CANCELADA: "cm-badge-red",
  };

  const STATUS_TEXTO = {
    CONCLUIDA: "Concluída",
    PENDENTE: "Pendente",
    CANCELADA: "Cancelada",
  };

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Compras</h1>
          <p className="cm-page-subtitle">
            Histórico de vendas realizadas, itens e status de pagamento
          </p>
        </div>
        <div className="cm-page-actions">
          <div className="cm-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Buscar por cliente ou CPF"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button className="cm-button-pill" onClick={()=>{navigate('/compras/nova-compra')}}>
            <IconPlus width={14} height={14} />
            Nova Compra
          </button>
        </div>
      </div>

      {errorFetch && (
        <p className="cm-error">
          Erro inesperado ao carregar compras, contate um operador.
        </p>
      )}

      <div
        className="cm-filter-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {["TODOS", "CONCLUIDA", "PENDENTE", "CANCELADA"].map((status) => (
            <button
              key={status}
              className={
                "cm-filter-pill" + (statusFiltro === status ? " active" : "")
              }
              onClick={() => setStatusFiltro(status)}
            >
              {status === "TODOS" ? "Todas" : STATUS_TEXTO[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="cm-card">
        <h2 className="cm-section-title">Histórico de Compras</h2>

        {compras.length === 0 ? (
          <p>Nenhuma compra encontrada.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th># ID</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Forma de Pagamento</th>
                <th>Valor Total</th>
                <th>Qtd. Itens</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((compra) => (
                <tr key={compra.id}>
                  <td>
                    <strong>#{compra.id}</strong>
                  </td>
                  <td>
                    <strong>{compra.cliente?.nome || "Cliente Removido"}</strong>
                  </td>
                  <td>
                    {new Date(compra.data).toLocaleDateString("pt-BR")}
                  </td>
                  <td>{compra.formaPagamento}</td>
                  <td>
                    <strong className="cm-text-highlight">
                      {intlCurr.format(compra.valorTotal)}
                    </strong>
                  </td>
                  <td>
                    {compra.itens.length}
                  </td>
                  <td>
                    <span
                      className={
                        "cm-badge " +
                        (STATUS_BADGE[compra.status] || "cm-badge-gray")
                      }
                    >
                      {STATUS_TEXTO[compra.status] || compra.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}