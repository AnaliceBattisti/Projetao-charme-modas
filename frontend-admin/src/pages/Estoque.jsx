import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { IconPlus, IconSearch } from "../icons.jsx";
import { situacao } from "../estoqueUtils.js";
import { normalizarBusca } from "../clientesUtils.js";

const emptyEntradaForm = { gradeId: "", quantidade: "", motivo: "" };
const emptyAjusteForm = { gradeId: "", quantidade: "", motivo: "" };
const PAGE_SIZE = 10;

const TIPO_BADGE = {
  ENTRADA: "cm-badge-green",
  SAIDA: "cm-badge-red",
  AJUSTE: "cm-badge-purple",
};

export default function Estoque() {
  const [grades, setGrades] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modo, setModo] = useState(null); // "entrada" | "ajuste" | null
  const [entradaForm, setEntradaForm] = useState(emptyEntradaForm);
  const [ajusteForm, setAjusteForm] = useState(emptyAjusteForm);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);

  function loadAll() {
    setLoading(true);
    Promise.all([api.get("/estoque"), api.get("/estoque/movimentacoes")])
      .then(([v, m]) => {
        setGrades(v);
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
        gradeId: Number(entradaForm.gradeId),
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
        gradeId: Number(ajusteForm.gradeId),
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

  // O estoque mínimo é regra de estoque, então se edita aqui mesmo, na linha.
  async function salvarMinimo(g, valor) {
    const novo = Number(valor);
    if (Number.isNaN(novo) || novo === g.estoqueMinimo) return;
    setError(null);
    try {
      await api.put(
        `/produtos/${g.variacao.produtoId}/variacoes/${g.variacaoId}/grades/${g.id}`,
        { estoqueMinimo: novo }
      );
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function gradeLabel(g) {
    const sku = g.sku ? ` (${g.sku})` : "";
    return `${g.variacao.produto.nome} — ${g.variacao.cor} / ${g.tamanho}${sku}`;
  }

  function previewEstoque(gradeId, quantidade) {
    const grade = grades.find((g) => g.id === Number(gradeId));
    if (!grade || quantidade === "" || Number.isNaN(Number(quantidade))) return null;
    const atualizado = grade.estoqueAtual + Number(quantidade);
    return `Estoque atual: ${grade.estoqueAtual} un → Estoque atualizado: ${atualizado} un`;
  }

  // Busca por produto, cor, tamanho ou SKU — a tabela de situação cresce um pouco
  // a cada cor/tamanho cadastrado, então sem filtro ela vira uma lista sem fim.
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    if (!termo) return grades;
    return grades.filter((g) =>
      [g.variacao.produto.nome, g.variacao.cor, g.tamanho, g.sku]
        .filter(Boolean)
        .some((campo) => normalizarBusca(campo).includes(termo))
    );
  }, [grades, busca]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(page, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  function atualizarBusca(valor) {
    setBusca(valor);
    setPage(1);
  }

  const itensEmEstoque = grades.reduce((sum, g) => sum + g.estoqueAtual, 0);
  const totalSkus = grades.filter((g) => g.sku).length;
  const totalAlertas = grades.filter((g) => situacao(g).label !== "Adequado").length;
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const movimentacoesDoMes = movimentacoes.filter((m) => new Date(m.data) >= inicioMes).length;

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Estoque</h1>
          <p className="cm-page-subtitle">
            Quantidades por cor e tamanho. O mínimo é editável na própria linha e serve de alerta.
          </p>
        </div>
        <div className="cm-page-actions">
          <div className="cm-search">
            <IconSearch />
            <input
              placeholder="Buscar por produto, cor, tamanho ou SKU"
              value={busca}
              onChange={(e) => atualizarBusca(e.target.value)}
            />
          </div>
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

      <div className="cm-card-grid">
        <div className="cm-card">
          <p>Itens em estoque</p>
          <strong>{itensEmEstoque}</strong>
        </div>
        <div className="cm-card">
          <p>SKUs</p>
          <strong>{totalSkus}</strong>
        </div>
        <div className="cm-card">
          <p>Alertas</p>
          <strong>{totalAlertas}</strong>
        </div>
        <div className="cm-card">
          <p>Movimentações (mês)</p>
          <strong>{movimentacoesDoMes}</strong>
        </div>
      </div>

      {modo === "entrada" && (
        <div className="cm-card" style={{ marginBottom: 20 }}>
          <h2 className="cm-section-title">Registrar entrada</h2>
          <form className="cm-inline-form" onSubmit={handleRegistrarEntrada}>
            <select
              className="cm-input"
              value={entradaForm.gradeId}
              onChange={(e) => setEntradaForm({ ...entradaForm, gradeId: e.target.value })}
              required
            >
              <option value="">Cor / tamanho...</option>
              {grades.map((v) => (
                <option key={v.id} value={v.id}>
                  {gradeLabel(v)}
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
            {previewEstoque(entradaForm.gradeId, entradaForm.quantidade) && (
              <p className="cm-text-muted" style={{ width: "100%", margin: 0 }}>
                {previewEstoque(entradaForm.gradeId, entradaForm.quantidade)}
              </p>
            )}
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
              value={ajusteForm.gradeId}
              onChange={(e) => setAjusteForm({ ...ajusteForm, gradeId: e.target.value })}
              required
            >
              <option value="">Cor / tamanho...</option>
              {grades.map((v) => (
                <option key={v.id} value={v.id}>
                  {gradeLabel(v)}
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
            {previewEstoque(ajusteForm.gradeId, ajusteForm.quantidade) && (
              <p className="cm-text-muted" style={{ width: "100%", margin: 0 }}>
                {previewEstoque(ajusteForm.gradeId, ajusteForm.quantidade)}
              </p>
            )}
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
        ) : grades.length === 0 ? (
          <p>Nenhuma variação cadastrada ainda.</p>
        ) : filtrados.length === 0 ? (
          <p>Nenhum resultado para "{busca}".</p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
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
                  {visiveis.map((v) => {
                    const s = situacao(v);
                    return (
                      <tr key={v.id}>
                        <td>{v.variacao.produto.nome}</td>
                        <td>
                          {v.variacao.cor} · {v.tamanho}
                        </td>
                        <td>{v.sku || "—"}</td>
                        <td>
                          <input
                            className="cm-input cm-input-minimo"
                            type="number"
                            min="0"
                            defaultValue={v.estoqueMinimo}
                            title="Alerta quando o estoque chegar nesse número"
                            onBlur={(e) => salvarMinimo(v, e.target.value)}
                          />
                        </td>
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
            </div>
            <div className="cm-page-actions" style={{ justifyContent: "space-between", marginTop: 16 }}>
              <span className="cm-text-muted">
                {filtrados.length} {filtrados.length === 1 ? "variação" : "variações"}
                {busca ? " encontradas" : " cadastradas"}
              </span>
              {totalPaginas > 1 && (
                <nav className="cm-page-actions" aria-label="Paginação do estoque">
                  <button
                    className="cm-button-outline"
                    disabled={paginaAtual === 1}
                    onClick={() => setPage(paginaAtual - 1)}
                  >
                    Anterior
                  </button>
                  <span className="cm-text-muted">{paginaAtual} de {totalPaginas}</span>
                  <button
                    className="cm-button-outline"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPage(paginaAtual + 1)}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </div>
          </>
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
                    {m.grade.variacao.produto.nome} · {m.grade.variacao.cor}/{m.grade.tamanho}
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
