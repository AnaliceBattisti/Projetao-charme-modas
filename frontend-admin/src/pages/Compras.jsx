import { useEffect, useState } from "react";
import { api } from "../api";
import { IconPlus, IconSearch } from "../icons";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";

export default function Compras() {
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [compras, setCompras] = useState([]);
  const navigate = useNavigate();

  const [showModalDetalhes, setShowModalDetalhes] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [compraEmFoco, setCompraEmFoco] = useState(null);

  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState(null);

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

  const FORMA_PAGAMENTO_TEXTO = {
    CREDIARIO: "Crediário",
    PIX: "Pix",
    DINHEIRO: "Dinheiro",
    CARTAO_CREDITO: "Cartão de Crédito",
    CARTAO_DEBITO: "Cartão de Débito",
  }

  const handleAbrirDetalhes = (compra) => {
    setCompraEmFoco(compra);
    setShowModalDetalhes(true);
  };

  const handleAbrirCancelar = (compra) => {
    setCompraEmFoco(compra);
    setErrorCancelar(null);
    setShowModalCancelar(true);
  };

  const handleFecharModais = () => {
    setShowModalDetalhes(false);
    setShowModalCancelar(false);
    setCompraEmFoco(null);
    setErrorCancelar(null);
  };

  const handleConfirmarCancelamento = async () => {
    if (!compraEmFoco) return;

    setLoadingCancelar(true);
    setErrorCancelar(null);

    try {
      await api.put(`/compras/${compraEmFoco.id}/cancelar`);
      handleFecharModais();
      loadAll();
    } catch (err) {
      setErrorCancelar(
        err.response?.data?.erro || "Erro inesperado ao cancelar a compra."
      );
    } finally {
      setLoadingCancelar(false);
    }
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

      <Modal
        open={showModalCancelar}
        onClose={handleFecharModais}
        title="Cancelar Compra"
      >
        <div style={{ marginTop: "12px" }}>
          {errorCancelar && <div className="cm-error">{errorCancelar}</div>}

          <p style={{ fontSize: "1rem", lineHeight: "1.5", marginBottom: "24px" }}>
            Deseja confirmar o cancelamento da compra de{" "}
            <strong>{compraEmFoco?.cliente?.nome || "Cliente"}</strong> no valor
            de{" "}
            <strong className="cm-text-highlight">
              {intlCurr.format(compraEmFoco?.valorTotal || 0)}
            </strong>
            ?
          </p>

          <p className="cm-text-muted" style={{ marginBottom: "24px" }}>
            * Esta ação irá estornar os produtos ao estoque e devolver o limite do crediário ao cliente.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="cm-button-outline"
              onClick={handleFecharModais}
              disabled={loadingCancelar}
            >
              Voltar
            </button>

            <button
              type="button"
              className="cm-button-pill"
              style={{
                background: "var(--cm-text-error)",
                minWidth: "140px",
                justifyContent: "center",
              }}
              onClick={handleConfirmarCancelamento}
              disabled={loadingCancelar}
            >
              {loadingCancelar ? "Cancelando..." : "Confirmar Cancelamento"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showModalDetalhes}
        onClose={handleFecharModais}
        title={`Detalhes da Compra #${compraEmFoco?.id || ""}`}
      >
        <div style={{ marginTop: "12px" }}>
          <div
            className="cm-card"
            style={{
              background: "var(--cm-surface-alt)",
              marginBottom: "16px",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Cliente
                </label>
                <div style={{ fontWeight: 600, color: "var(--cm-plum)" }}>
                  {compraEmFoco?.cliente?.nome}
                </div>
                <div className="cm-text-muted">
                  CPF: {compraEmFoco?.cliente?.cpf || "Não informado"}
                </div>
              </div>

              <span
                className={
                  "cm-badge " +
                  (STATUS_BADGE[compraEmFoco?.status] || "cm-badge-gray")
                }
              >
                {STATUS_TEXTO[compraEmFoco?.status] || compraEmFoco?.status}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--cm-border)",
              }}
            >
              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Data
                </label>
                <div>
                  {compraEmFoco?.data
                    ? new Date(compraEmFoco.data).toLocaleDateString("pt-BR")
                    : "—"}
                </div>
              </div>

              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Pagamento
                </label>
                <div>{FORMA_PAGAMENTO_TEXTO[compraEmFoco?.formaPagamento] || compraEmFoco?.formaPagamento}</div>
              </div>

              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Total
                </label>
                <div style={{ fontWeight: 700, color: "var(--cm-vinho)" }}>
                  {intlCurr.format(compraEmFoco?.valorTotal || 0)}
                </div>
              </div>
            </div>
          </div>

          {compraEmFoco?.itens && compraEmFoco.itens.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3 className="cm-section-title" style={{ fontSize: "0.95rem" }}>
                Itens da Compra
              </h3>
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Produto / Variação</th>
                    <th>Qtd.</th>
                    <th>Unitário</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {compraEmFoco.itens.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.variacao?.produto?.nome || "Produto"}{" "}
                        <small className="cm-text-muted">
                          ({item.variacao?.cor || "—"}/
                          {item.variacao?.tamanho || "—"})
                        </small>
                      </td>
                      <td>{item.quantidade}</td>
                      <td>{intlCurr.format(item.precoUnitario)}</td>
                      <td>
                        <strong>
                          {intlCurr.format(item.quantidade * item.precoUnitario)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </Modal>

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
                <th>Ações</th>
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
                  <td>{FORMA_PAGAMENTO_TEXTO[compra.formaPagamento] || compra.formaPagamento}</td>
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
                  <td>
                    <button
                        className="cm-link-button"
                        onClick={() => handleAbrirDetalhes(compra)}
                      >
                      <strong>Ver Detalhes</strong>
                    </button>

                    <div style={{ display: "flex", gap: "12px" }}>
                      {compra.status === "PENDENTE" && (
                        <button
                          className="cm-link-button cm-text-error"
                          onClick={() => handleAbrirCancelar(compra)}
                        >
                          <strong>Cancelar</strong>
                        </button>
                      )}
                    </div>
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