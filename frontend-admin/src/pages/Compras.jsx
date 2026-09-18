import { useEffect, useState } from "react";
import { api } from "../api";
import { IconPlus, IconSearch } from "../icons";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import Paginacao from "../components/Paginacao.jsx";

const ITENS_POR_PAGINA = 10;

export default function Compras() {
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("TODOS");
  const [compras, setCompras] = useState([]);
  const [pagina, setPagina] = useState(1);
  const navigate = useNavigate();

  const [showModalDetalhes, setShowModalDetalhes] = useState(false);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  const [compraEmFoco, setCompraEmFoco] = useState(null);

  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState(null);
  const [aprovando, setAprovando] = useState(false);
  const [erroAprovacao, setErroAprovacao] = useState(null);
  const [numeroParcelas, setNumeroParcelas] = useState(1);

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
    SOLICITADA: "cm-badge-yellow",
    CONCLUIDA: "cm-badge-green",
    PENDENTE: "cm-badge-yellow",
    CANCELADA: "cm-badge-red",
  };

  const STATUS_TEXTO = {
    SOLICITADA: "Aguardando aprovação",
    CONCLUIDA: "Concluída",
    PENDENTE: "Pendente",
    CANCELADA: "Cancelada",
  };

  const FORMA_PAGAMENTO_TEXTO = {
    A_VISTA: "À vista (combinado com a loja)",
    CREDIARIO: "Crediário",
    PIX: "Pix",
    DINHEIRO: "Dinheiro",
    CARTAO_CREDITO: "Cartão de Crédito",
    CARTAO_DEBITO: "Cartão de Débito",
  }

  const handleAbrirDetalhes = (compra) => {
    setErroAprovacao(null);
    setNumeroParcelas(1);
    setCompraEmFoco(compra);
    setShowModalDetalhes(true);
  };

  const handleAbrirCancelar = (compra) => {
    setCompraEmFoco(compra);
    setErrorCancelar(null);
    setShowModalCancelar(true);
  };

  const handleFecharModais = () => {
    if (aprovando) return;
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

  const handleAprovarPedido = async () => {
    if (!compraEmFoco || aprovando) return;
    setAprovando(true);
    setErroAprovacao(null);
    try {
      const compra = await api.put(`/compras/${compraEmFoco.id}/aprovar`, {
        numeroParcelas: compraEmFoco.formaPagamento === "CREDIARIO" ? Number(numeroParcelas) : 1,
      });
      setCompraEmFoco({ ...compraEmFoco, ...compra });
      loadAll();
    } catch (error) {
      setErroAprovacao(error.message);
    } finally {
      setAprovando(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(compras.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const comprasPaginadas = compras.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

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
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
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
            {compraEmFoco?.status === "SOLICITADA"
              ? "Este pedido ainda não baixou estoque nem utilizou limite. O cancelamento apenas encerra a solicitação."
              : "* Esta ação irá estornar os produtos ao estoque e devolver o limite do crediário ao cliente."}
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
                {compraEmFoco?.status === "SOLICITADA" && <div className="cm-text-muted">
                  Contato: {compraEmFoco.cliente?.telefone || compraEmFoco.cliente?.email || "Não informado"}
                </div>}
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

          {compraEmFoco?.status === "SOLICITADA" && <div className="cm-card" style={{ marginBottom: 16 }}>
            <h3 className="cm-section-title">Pedido enviado pela loja virtual</h3>
            <p className="cm-text-muted">Confirme as peças e combine a entrega ou retirada com o cliente antes de aprovar.</p>
            {compraEmFoco.formaPagamento === "CREDIARIO" ? <>
              <label className="cm-label" htmlFor="pedido-parcelas">Parcelas combinadas com o cliente</label>
              <select id="pedido-parcelas" className="cm-input" value={numeroParcelas} disabled={aprovando} onChange={(e) => setNumeroParcelas(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}x</option>)}
              </select>
              <p className="cm-text-muted">Ao aprovar, o sistema valida estoque e limite, registra a venda e gera as parcelas.</p>
            </> : <p className="cm-text-muted">Aprove somente depois de confirmar o pagamento à vista com o cliente. A venda será registrada e o estoque será baixado.</p>}
            {erroAprovacao && <p className="cm-error" role="alert">{erroAprovacao}</p>}
            <button type="button" className="cm-button-pill" disabled={aprovando} onClick={handleAprovarPedido}>
              {aprovando ? "Aprovando..." : "Aprovar pedido"}
            </button>
          </div>}

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
                        {item.grade?.variacao?.produto?.nome || "Produto"}{" "}
                        <small className="cm-text-muted">
                          ({item.grade?.variacao?.cor || "—"}/
                          {item.grade?.tamanho || "—"})
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
          {["TODOS", "SOLICITADA", "CONCLUIDA", "PENDENTE", "CANCELADA"].map((status) => (
            <button
              key={status}
              className={
                "cm-filter-pill" + (statusFiltro === status ? " active" : "")
              }
              onClick={() => {
                setStatusFiltro(status);
                setPagina(1);
              }}
            >
              {status === "TODOS" ? "Todas" : STATUS_TEXTO[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="cm-card">
        <h2 className="cm-section-title">Histórico de Compras</h2>

        {loading ? (
          <p>Carregando compras...</p>
        ) : compras.length === 0 ? (
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
              {comprasPaginadas.map((compra) => (
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
                      {["PENDENTE", "SOLICITADA"].includes(compra.status) && (
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
        {!loading && !errorFetch && (
          <Paginacao
            pagina={paginaAtual}
            totalItens={compras.length}
            itensPorPagina={ITENS_POR_PAGINA}
            onMudarPagina={setPagina}
            label="Paginação de compras"
          />
        )}
      </div>
    </div>
  );
}
