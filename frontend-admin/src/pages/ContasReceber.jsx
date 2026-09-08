import { useEffect, useState } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

export default function ContasReceber() {
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState(false);
  const [diasFiltro, setDiasFiltro] = useState(30);
  const [resumo, setResumo] = useState({});
  const [dadosValores, setDadosValores] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [parcelaEmFoco, setParcelaEmFoco] = useState(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [errorRegister, setErrorRegister] = useState(false);
  const intlCurr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

  function loadAll() {
    setLoading(true);
    setErrorFetch(false);
    api.get(`/parcelas?dias=${diasFiltro}`).then(response => {
      setResumo(response.resumo);
      setDadosValores(response.dados)
    })
      .catch((err) => {
        setErrorFetch(true)
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [])

  useEffect(loadAll, [diasFiltro])

  const STATUS_BADGE = {
    PENDENTE: "cm-badge-yellow",
    ATRASADA: "cm-badge-red",
    PAGA: "cm-badge-green",
  };

  const STATUS_TEXTO = {
    PENDENTE: "Pendente",
    ATRASADA: "Atrasada",
    PAGA: "Paga",
  };

  async function handleRegistrarPagamento(e) {
    e.preventDefault();
    setErrorRegister(false);
    setLoadingRegister(true);
    try {
      await api.put(`/parcelas/baixa/${parcelaEmFoco.parcela.id}`);
      setLoadingRegister(false);
      handleFecharModal();
      loadAll();
    } catch (err) {
      setErrorRegister(true);
    }
  }

  const handleAbrirModal = (item) => {
    setParcelaEmFoco(item);
    setShowModal(true);
  };

  const handleFecharModal = () => {
    setShowModal(false);
    setParcelaEmFoco(null);
  };

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Contas a Receber</h1>
          <p className="cm-page-subtitle">Controle de parcelas e valores a receber nos próximos dias</p>
        </div>
      </div>

      {errorFetch && <p className="cm-error">Erro inesperado ocorreu, contate um operador.</p>}

      <Modal open={showModal} onClose={() => { setShowModal(false); setParcelaEmFoco(null) }} title="Confirmar Pagamento">
        <div style={{ marginTop: "12px" }}>
          {errorRegister && <div className="cm-error">Error inesperado ao dar baixa em parcela, contate operador.</div>}

          <div
            className="cm-card"
            style={{
              background: "var(--cm-surface-alt)",
              marginBottom: "20px",
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
                  {parcelaEmFoco?.cliente.nome}
                </div>
              </div>

              <span
                className={
                  "cm-badge " + (STATUS_BADGE[parcelaEmFoco?.parcela.status] || "cm-badge-gray")
                }
              >
                {parcelaEmFoco?.parcela.status}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                paddingTop: "12px",
                borderTop: "1px solid var(--cm-border)",
              }}
            >
              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Parcela
                </label>
                <div>
                  {`${parcelaEmFoco?.parcela.numero}/${parcelaEmFoco?.parcela.totalParcelas}`}
                </div>
              </div>

              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Vencimento
                </label>
                <div>
                  {new Date(parcelaEmFoco?.parcela.dataVencimento).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              padding: "16px",
              background: "var(--cm-surface)",
              border: "1px solid var(--cm-border)",
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            <div className="cm-text-muted" style={{ fontSize: "0.85rem" }}>
              Valor total a ser baixado
            </div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "700",
                color: "var(--cm-vinho)",
                marginTop: "4px",
              }}
            >
              {intlCurr.format(parcelaEmFoco?.parcela.valor)}
            </div>
          </div>

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
              onClick={handleFecharModal}
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="cm-button-pill"
              onClick={handleRegistrarPagamento}
              disabled={loading}
              style={{ minWidth: "140px", justifyContent: "center" }}
            >
              {loadingRegister ? "Processando..." : "Confirmar Baixa"}
            </button>
          </div>
        </div>
      </Modal>

      {
        loading ?
          <p>Carregando...</p> :
          <div className="cm-card-grid">
            <div className="cm-card">
              <p>A receber</p>
              <strong>{intlCurr.format(resumo.totalAReceber)}</strong>
            </div>
            <div className="cm-card">
              <p>Vence neste período</p>
              <strong>{intlCurr.format(resumo.totalAVencer)}</strong>
            </div>
            <div className="cm-card">
              <p>Em atrasos</p>
              <strong className="cm-text-error">{intlCurr.format(resumo.totalEmAtraso)}</strong>
            </div>
            <div className="cm-card">
              <p>Clientes ativos</p>
              <strong>{resumo.totalClientesUnicos}</strong>
            </div>
          </div>
      }

      <div className="cm-filter-row">
        {[30,45,60].map((c) => (
          <button
            key={c}
            className={"cm-filter-pill" + (diasFiltro === c ? " active" : "")}
            onClick={() => setDiasFiltro(c)}
          >
            {c} Dias
          </button>
        ))}
      </div>
      <div className="cm-card">
        <h2 className="cm-section-title">Parcelas</h2>

        {dadosValores.length === 0 ? (
          <p>Nenhuma parcela pendente encontrada.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {dadosValores.map((item) => (
                <tr key={item.parcela.id}>
                  <td>
                    <strong>{item.cliente.nome}</strong>
                  </td>
                  <td>
                    {`${item.parcela.numero}/${item.parcela.totalParcelas}`}
                  </td>
                  <td>
                    {new Date(item.parcela.dataVencimento).toLocaleDateString(
                      "pt-BR",
                      { timeZone: "UTC" }
                    )}
                  </td>
                  <td>
                    <strong className="cm-text-highlight">{intlCurr.format(item.parcela.valor)}</strong>
                  </td>

                  <td>
                    <span
                      className={
                        "cm-badge " +
                        (STATUS_BADGE[item.parcela.status] || "cm-badge-gray")
                      }
                    >
                      {STATUS_TEXTO[item.parcela.status]}
                    </span>
                  </td>

                  <td>
                    <button
                      className="cm-link-button"
                      onClick={() => handleAbrirModal(item)}
                    >
                      <strong>Registrar Pagamento</strong>
                    </button>
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
