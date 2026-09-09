import { useEffect, useState } from "react";
import { api } from "../api";
import { IconBlockStoreCredit, IconLimitStoreCredit, IconSearch } from "../icons";
import Modal from "../components/Modal";

// Endpoints: GET /crediario, GET /crediario/cliente/:clienteId, POST/PUT /crediario
export default function Crediario() {
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState(false);
  const [busca, setBusca] = useState("");
  const [crediarios, setCrediarios] = useState([]);

  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [crediarioEmFoco, setCrediarioEmFoco] = useState(null);

  const [novoLimiteTotal, setNovoLimiteTotal] = useState("");
  const [justificativa, setJustificativa] = useState("");

  const [loadingSave, setLoadingSave] = useState(false);
  const [errorSave, setErrorSave] = useState(null);

  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState(null);

  const intlCurr = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function loadAll() {
    setLoading(true);
    setErrorFetch(false);

    let url = "/crediarios";
    const params = new URLSearchParams();
    if (busca) params.append("busca", busca);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    api
      .get(url)
      .then((response) => {
        setCrediarios(Array.isArray(response) ? response : []);
      })
      .catch(() => {
        setErrorFetch(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);
  useEffect(loadAll, [busca]);

  const STATUS_BADGE = {
    ATIVO: "cm-badge-green",
    BLOQUEADO: "cm-badge-red",
  };

  const STATUS_TEXTO = {
    ATIVO: "Ativo",
    BLOQUEADO: "Bloqueado",
  };

  const handleAbrirEditar = (item) => {
    setCrediarioEmFoco(item);
    setNovoLimiteTotal(item.limiteCredito || 0);
    setJustificativa("")
    setErrorSave(null);
    setShowModalEditar(true);
  };

  const handleAbrirCancelar = (item) => {
    setCrediarioEmFoco(item);
    setErrorCancelar(null);
    setShowModalCancelar(true);
  };

  const handleFecharModal = () => {
    setShowModalEditar(false);
    setShowModalCancelar(false);
    setCrediarioEmFoco(null);
    setNovoLimiteTotal("")
    setJustificativa("")
    setErrorSave(null);
    setErrorCancelar(null);
  };

  const handleSalvarCrediario = async (e) => {
    e.preventDefault();
    if (!crediarioEmFoco) return;

    setLoadingSave(true);
    setErrorSave(null);

    if (novoLimiteTotal === crediarioEmFoco.limiteCredito) {
      setErrorSave("Novo limite é igual ao limite anterior.")
      return;
    }

    try {
      await api.post(`/crediarios/${crediarioEmFoco.id}/limite`, {
        valorLimite: Number(novoLimiteTotal),
        motivo: justificativa,
      });
      handleFecharModal();
      loadAll();
    } catch (err) {
      console.log(err)
      setErrorSave(
        err.response?.data?.erro || "Erro inesperado ao atualizar o crediário."
      );
    } finally {
      setLoadingSave(false);
    }
  }


  const handleConfirmarBloqueio = async () => {
    if (!crediarioEmFoco) return;

    setLoadingCancelar(true);
    setErrorCancelar(null);

    const acao = crediarioEmFoco.status === "ATIVO" ? true : false;

    try {
      await api.post(`/crediarios/${crediarioEmFoco.id}/bloqueio/${acao}`);
      handleFecharModal();
      loadAll();
    } catch (err) {
      console.log(err)
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
          <h1 className="cm-page-title">Crediário</h1>
          <p className="cm-page-subtitle">Gestão de contas de crediário interno, limites de crédito e bloqueios</p>
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
        </div>
      </div>

      {errorFetch && (
        <p className="cm-error">
          Erro inesperado ao carregar contas de crediário, contate um operador.
        </p>
      )}

      <Modal
        open={showModalCancelar}
        onClose={handleFecharModal}
        title="Bloquear/Desbloquear Crediário"
      >
        <div style={{ marginTop: "12px" }}>
          {errorCancelar && <div className="cm-error">{errorCancelar}</div>}

          <p style={{ fontSize: "1rem", lineHeight: "1.5", marginBottom: "24px" }}>
            Deseja confirmar o {" "}
            <strong>{crediarioEmFoco?.status === "ATIVO" ? "Bloqueio" : "Desbloqueio"}</strong>
            {" "} do crediário do Cliente {" "}
            <strong className="cm-text-highlight">
              {`${crediarioEmFoco?.cliente?.nome}`}
            </strong>
            {" "} com limite TOTAL atual de {" "}
            <strong className="cm-text-highlight">
              {intlCurr.format(crediarioEmFoco?.limiteCredito || 0)}
            </strong>
            {" "} e com limite DISPONÍVEL atual de {" "}
            <strong className="cm-text-highlight">
              {intlCurr.format(crediarioEmFoco?.limiteDisponivel || 0)}
            </strong>
            ?
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
              onClick={handleFecharModal}
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
              onClick={handleConfirmarBloqueio}
              disabled={loadingCancelar}
            >
              {loadingCancelar ? "Cancelando..." : "Confirmar Cancelamento"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showModalEditar}
        onClose={handleFecharModal}
        title={`Ajustar Crediário: ${crediarioEmFoco?.cliente?.nome || ""}`}
      >
        <form onSubmit={handleSalvarCrediario} style={{ marginTop: "12px" }}>
          {errorSave && <div className="cm-error">{errorSave}</div>}

          <div className="cm-card" style={{ background: "var(--cm-surface-alt)", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span className="cm-text-muted">Limite Total Atual</span>
              <strong>{intlCurr.format(crediarioEmFoco?.limiteCredito || 0)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="cm-text-muted">Limite Disponível Atual</span>
              <strong className="cm-text-highlight">
                {intlCurr.format(crediarioEmFoco?.limiteDisponivel || 0)}
              </strong>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="cm-label">Novo Limite TOTAL (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="cm-input"
              value={novoLimiteTotal}
              onChange={(e) => setNovoLimiteTotal(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="cm-label">Justificativa</label>
            <input
              type="text"
              className="cm-input"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              required
            />
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
              disabled={loadingSave}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="cm-button-pill"
              disabled={loadingSave}
              style={{ minWidth: "120px", justifyContent: "center" }}
            >
              {loadingSave ? "Salvar..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </Modal>

      <div className="cm-card">
        <h2 className="cm-section-title">Contas de Crediário</h2>

        {crediarios.length === 0 ? (
          <p>Nenhuma conta de crediário encontrada.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>CPF</th>
                <th>Limite Total</th>
                <th>Limite Utilizado</th>
                <th>Limite Disponível</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {crediarios.map((item) => {
                const total = Number(item.limiteCredito || 0);
                const disponivel = Number(item.limiteDisponivel || 0);
                const utilizado = total - disponivel;

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.cliente?.nome || "-"}</strong>
                    </td>
                    <td>{item.cliente?.cpf || "—"}</td>
                    <td>{intlCurr.format(total)}</td>
                    <td>
                      <span className="cm-text-warning">
                        {intlCurr.format(utilizado)}
                      </span>
                    </td>
                    <td>
                      <strong className="cm-text-highlight">
                        {intlCurr.format(disponivel)}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={
                          "cm-badge " +
                          (STATUS_BADGE[item.status] || "cm-badge-gray")
                        }
                      >
                        {STATUS_TEXTO[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="cm-link-button"
                          onClick={() => handleAbrirEditar(item)}
                        >
                          <IconLimitStoreCredit/>
                          <strong>Ajustar Limite</strong>
                        </button>

                        <button
                          className="cm-link-button"
                          onClick={() => handleAbrirCancelar(item)}
                        >
                          <IconBlockStoreCredit/>
                          <strong>{`${item.status === "ATIVO" ? "Bloquear" : "Desbloquear"}`}</strong>
                        </button>
                      </div>
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
