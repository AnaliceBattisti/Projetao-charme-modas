import { useEffect, useState } from "react";
import { api } from "../api.js";
import { IconPlus } from "../icons.jsx";

const emptyEntradaForm = { variacaoId: "", quantidade: "", motivo: "" };
const emptyAjusteForm = { variacaoId: "", quantidade: "", motivo: "" };

const TIPO_BADGE = {
  ENTRADA: "cm-badge-green",
  SAIDA: "cm-badge-red",
  AJUSTE: "cm-badge-purple",
};

function situacao(variacao) {
  if (variacao.estoqueAtual <= 0) return { label: "Esgotado", badge: "cm-badge-red" };
  if (variacao.estoqueAtual <= variacao.estoqueMinimo)
    return { label: "Estoque baixo", badge: "cm-badge-yellow" };
  return { label: "Adequado", badge: "cm-badge-green" };
}

export default function Estoque() {
  const [variacoes, setVariacoes] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modo, setModo] = useState(null); // "entrada" | "ajuste" | null
  const [entradaForm, setEntradaForm] = useState(emptyEntradaForm);
  const [ajusteForm, setAjusteForm] = useState(emptyAjusteForm);

  function loadAll() {
    setLoading(true);
    Promise.all([api.get("/estoque"), api.get("/estoque/movimentacoes")])
      .then(([v, m]) => {
        setVariacoes(v);
        setMovimentacoes(m);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  async function handleRegistrarEntrada(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/estoque/movimentacoes", {
        variacaoId: Number(entradaForm.variacaoId),
        tipo: "ENTRADA",
        quantidade: Number(entradaForm.quantidade),
        motivo: entradaForm.motivo,
      });
      setEntradaForm(emptyEntradaForm);
      setModo(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAjuste(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/estoque/movimentacoes", {
        variacaoId: Number(ajusteForm.variacaoId),
        tipo: "AJUSTE",
        quantidade: Number(ajusteForm.quantidade),
        motivo: ajusteForm.motivo,
      });
      setAjusteForm(emptyAjusteForm);
      setModo(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function variacaoLabel(v) {
    return `${v.produto.nome} — ${v.cor || "—"} / ${v.tamanho || "—"} (${v.sku})`;
  }

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Estoque</h1>
          <p className="cm-page-subtitle">
            Controle de variações, alertas de estoque mínimo e movimentações.
          </p>
        </div>
        <div className="cm-page-actions">
          <button
            className="cm-button-outline"
            onClick={() => setModo(modo === "ajuste" ? null : "ajuste")}
          >
            Ajuste manual
          </button>
          <button
            className="cm-button-pill"
            onClick={() => setModo(modo === "entrada" ? null : "entrada")}
          >
            <IconPlus width={14} height={14} />
            Registrar entrada
          </button>
        </div>
      </div>

      {error && <p className="cm-error">{error}</p>}

      {modo === "entrada" && (
        <div className="cm-card" style={{ marginBottom: 20 }}>
          <h2 className="cm-section-title">Registrar entrada</h2>
          <form className="cm-inline-form" onSubmit={handleRegistrarEntrada}>
            <select
              className="cm-input"
              value={entradaForm.variacaoId}
              onChange={(e) => setEntradaForm({ ...entradaForm, variacaoId: e.target.value })}
              required
            >
              <option value="">Variação...</option>
              {variacoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {variacaoLabel(v)}
                </option>
              ))}
            </select>
            <input
              className="cm-input"
              type="number"
              min="1"
              placeholder="Quantidade"
              value={entradaForm.quantidade}
              onChange={(e) => setEntradaForm({ ...entradaForm, quantidade: e.target.value })}
              required
            />
            <input
              className="cm-input"
              placeholder="Motivo (ex.: Chegada de mercadoria)"
              value={entradaForm.motivo}
              onChange={(e) => setEntradaForm({ ...entradaForm, motivo: e.target.value })}
            />
            <button className="cm-button-pill" type="submit">
              Confirmar
            </button>
          </form>
        </div>
      )}

      {modo === "ajuste" && (
        <div className="cm-card" style={{ marginBottom: 20 }}>
          <h2 className="cm-section-title">Ajuste manual</h2>
          <p className="cm-text-muted" style={{ marginTop: -8, marginBottom: 12 }}>
            Use quantidade negativa pra corrigir perda/dano, positiva pra corrigir a mais.
          </p>
          <form className="cm-inline-form" onSubmit={handleAjuste}>
            <select
              className="cm-input"
              value={ajusteForm.variacaoId}
              onChange={(e) => setAjusteForm({ ...ajusteForm, variacaoId: e.target.value })}
              required
            >
              <option value="">Variação...</option>
              {variacoes.map((v) => (
                <option key={v.id} value={v.id}>
                  {variacaoLabel(v)}
                </option>
              ))}
            </select>
            <input
              className="cm-input"
              type="number"
              placeholder="Quantidade (+/-)"
              value={ajusteForm.quantidade}
              onChange={(e) => setAjusteForm({ ...ajusteForm, quantidade: e.target.value })}
              required
            />
            <input
              className="cm-input"
              placeholder="Motivo (ex.: Inventário - item danificado)"
              value={ajusteForm.motivo}
              onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
            />
            <button className="cm-button-pill" type="submit">
              Confirmar
            </button>
          </form>
        </div>
      )}

      <div className="cm-card" style={{ marginBottom: 20 }}>
        {loading ? (
          <p>Carregando...</p>
        ) : variacoes.length === 0 ? (
          <p>Nenhuma variação cadastrada ainda.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Variação</th>
                <th>SKU</th>
                <th>Mínimo</th>
                <th>Atual</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {variacoes.map((v) => {
                const s = situacao(v);
                return (
                  <tr key={v.id}>
                    <td>{v.produto.nome}</td>
                    <td>
                      {v.cor || "—"} · {v.tamanho || "—"}
                    </td>
                    <td>{v.sku}</td>
                    <td>{v.estoqueMinimo}</td>
                    <td>
                      <strong>{v.estoqueAtual}</strong>
                    </td>
                    <td>
                      <span className={"cm-badge " + s.badge}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="cm-card">
        <h2 className="cm-section-title">Histórico de movimentações</h2>
        {movimentacoes.length === 0 ? (
          <p>Nenhuma movimentação registrada ainda.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Qtd.</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {m.variacao.produto.nome} · {m.variacao.cor || "—"}/{m.variacao.tamanho || "—"}
                  </td>
                  <td>
                    <span className={"cm-badge " + (TIPO_BADGE[m.tipo] || "cm-badge-gray")}>
                      {m.tipo}
                    </span>
                  </td>
                  <td>
                    {m.tipo === "SAIDA" ? "-" : m.quantidade >= 0 ? "+" : ""}
                    {m.quantidade}
                  </td>
                  <td>{m.motivo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
