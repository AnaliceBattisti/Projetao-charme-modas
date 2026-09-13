import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, BASE_URL } from "../api.js";
import { IconPlus, IconSearch, IconChevronRight, IconTrash } from "../icons.jsx";
import Modal from "../components/Modal.jsx";
import { formatCurrencyInput, parseCurrencyInput } from "../format.js";

const emptyForm = {
  fornecedorId: "",
  nome: "",
  descricao: "",
  marca: "",
  categoria: "",
  precoCusto: "",
  precoVenda: "",
};

const emptyCorForm = { cor: "" };
const emptyGradeForm = { tamanho: "", sku: "", estoqueMinimo: "" };

const CATEGORIAS = ["Feminino", "Masculino", "Infantil", "Acessórios"];

const CATEGORIA_BADGE = {
  Feminino: "cm-badge-pink",
  Masculino: "cm-badge-blue",
  Infantil: "cm-badge-green",
  Acessórios: "cm-badge-purple",
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [variacaoForms, setVariacaoForms] = useState({});
  const [gradeForms, setGradeForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todos");
  const [busca, setBusca] = useState("");

  function loadProdutos() {
    setLoading(true);
    api
      .get("/produtos")
      .then(setProdutos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProdutos();
    api.get("/fornecedores").then(setFornecedores).catch((err) => setError(err.message));
  }, []);

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/produtos", {
        ...form,
        fornecedorId: Number(form.fornecedorId),
        precoCusto: parseCurrencyInput(form.precoCusto),
        precoVenda: parseCurrencyInput(form.precoVenda),
      });
      closeForm();
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este produto?")) return;
    try {
      await api.del(`/produtos/${id}`);
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  function updateVariacaoForm(produtoId, field, value) {
    setVariacaoForms((prev) => ({
      ...prev,
      [produtoId]: { ...(prev[produtoId] || emptyCorForm), [field]: value },
    }));
  }

  function updateGradeForm(variacaoId, field, value) {
    setGradeForms((prev) => ({
      ...prev,
      [variacaoId]: { ...(prev[variacaoId] || emptyGradeForm), [field]: value },
    }));
  }

  // Cada variação é uma COR; a foto e os tamanhos penduram nela.
  async function handleAddVariacao(produtoId) {
    const variacao = variacaoForms[produtoId] || emptyCorForm;
    setError(null);
    if (!variacao.cor.trim()) {
      setError("Informe a cor antes de adicionar.");
      return;
    }
    try {
      await api.post(`/produtos/${produtoId}/variacoes`, { cor: variacao.cor });
      setVariacaoForms((prev) => ({ ...prev, [produtoId]: emptyCorForm }));
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  // Cada grade é um TAMANHO daquela cor: é onde o estoque vive.
  async function handleAddGrade(produtoId, variacaoId) {
    const grade = gradeForms[variacaoId] || emptyGradeForm;
    setError(null);
    if (!grade.tamanho.trim()) {
      setError("Informe o tamanho antes de adicionar.");
      return;
    }
    try {
      await api.post(`/produtos/${produtoId}/variacoes/${variacaoId}/grades`, grade);
      setGradeForms((prev) => ({ ...prev, [variacaoId]: emptyGradeForm }));
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteGrade(produtoId, variacaoId, gradeId) {
    if (!confirm("Remover este tamanho?")) return;
    setError(null);
    try {
      await api.del(`/produtos/${produtoId}/variacoes/${variacaoId}/grades/${gradeId}`);
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVariacaoImagemChange(produtoId, variacaoId, file) {
    if (!file) return;
    setError(null);
    try {
      const formData = new FormData();
      formData.append("imagem", file);
      await api.upload(`/produtos/${produtoId}/variacoes/${variacaoId}/imagem`, formData);
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteVariacao(produtoId, variacaoId) {
    if (!confirm("Remover esta cor e todos os seus tamanhos?")) return;
    setError(null);
    try {
      await api.del(`/produtos/${produtoId}/variacoes/${variacaoId}`);
      loadProdutos();
    } catch (err) {
      setError(err.message);
    }
  }

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const passaCategoria = categoriaFiltro === "Todos" || p.categoria === categoriaFiltro;
      const termo = busca.trim().toLowerCase();
      const passaBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.marca || "").toLowerCase().includes(termo);
      return passaCategoria && passaBusca;
    });
  }, [produtos, categoriaFiltro, busca]);

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Produtos</h1>
          <p className="cm-page-subtitle">Catálogo de peças por categoria, com variações e estoque.</p>
        </div>
        <div className="cm-page-actions">
          <div className="cm-search">
            <IconSearch />
            <input
              placeholder="Buscar por nome ou marca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button className="cm-button-pill" onClick={() => setShowForm(true)}>
            <IconPlus width={14} height={14} />
            Novo produto
          </button>
        </div>
      </div>

      {error && <p className="cm-error">{error}</p>}

      <Modal open={showForm} onClose={closeForm} title="Novo produto">
        {fornecedores.length === 0 ? (
            <p>
              Cadastre um <Link to="/fornecedores">fornecedor</Link> antes de criar um produto.
            </p>
          ) : (
            <form className="cm-inline-form" onSubmit={handleSubmit}>
              <select
                className="cm-input"
                value={form.fornecedorId}
                onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
                required
              >
                <option value="">Fornecedor...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nomeRazaoSocial}
                  </option>
                ))}
              </select>
              <input
                className="cm-input"
                placeholder="Nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
              <input
                className="cm-input"
                placeholder="Marca"
                value={form.marca}
                onChange={(e) => setForm({ ...form, marca: e.target.value })}
              />
              <select
                className="cm-input"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">Categoria...</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="cm-input"
                placeholder="Descrição"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
              <input
                className="cm-input"
                type="text"
                inputMode="decimal"
                placeholder="Preço de custo (0,00)"
                value={form.precoCusto}
                onChange={(e) => setForm({ ...form, precoCusto: formatCurrencyInput(e.target.value) })}
                required
              />
              <input
                className="cm-input"
                type="text"
                inputMode="decimal"
                placeholder="Preço de venda (0,00)"
                value={form.precoVenda}
                onChange={(e) => setForm({ ...form, precoVenda: formatCurrencyInput(e.target.value) })}
                required
              />
              <button className="cm-button-pill" type="submit">
                Salvar
              </button>
            </form>
          )}
      </Modal>

      <div className="cm-filter-row">
        <button
          className={"cm-filter-pill" + (categoriaFiltro === "Todos" ? " active" : "")}
          onClick={() => setCategoriaFiltro("Todos")}
        >
          Todos
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            className={"cm-filter-pill" + (categoriaFiltro === c ? " active" : "")}
            onClick={() => setCategoriaFiltro(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="cm-card">
        {loading ? (
          <p>Carregando...</p>
        ) : produtosFiltrados.length === 0 ? (
          <p>Nenhum produto encontrado.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((produto) => {
                // O estoque do produto é a soma das grades de todas as cores.
                const estoqueTotal = produto.variacoes.reduce(
                  (sum, v) => sum + v.grades.reduce((s2, g) => s2 + g.estoqueAtual, 0),
                  0
                );
                const capa = produto.variacoes.find((v) => v.imagemUrl)?.imagemUrl;
                const isExpanded = expandedId === produto.id;
                return (
                  <Fragment key={produto.id}>
                    <tr
                      className="cm-clickable-row"
                      onClick={() => setExpandedId(isExpanded ? null : produto.id)}
                    >
                      <td>
                        <div className="cm-produto-cell">
                          {capa ? (
                            <img className="cm-thumb" src={`${BASE_URL}${capa}`} alt={produto.nome} />
                          ) : (
                            <div className="cm-thumb cm-thumb-placeholder" />
                          )}
                          <div>
                            <strong>{produto.nome}</strong>
                            <br />
                            <span className="cm-text-muted">
                              {produto.marca || "sem marca"} · {produto.variacoes.length} {produto.variacoes.length === 1 ? "cor" : "cores"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {produto.categoria ? (
                          <span className={"cm-badge " + (CATEGORIA_BADGE[produto.categoria] || "cm-badge-gray")}>
                            {produto.categoria}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{produto.fornecedor?.nomeRazaoSocial}</td>
                      <td>R$ {Number(produto.precoVenda).toFixed(2)}</td>
                      <td className={estoqueTotal <= 5 ? "cm-badge-red" : ""}>
                        <strong>{estoqueTotal}</strong>
                      </td>
                      <td>
                        <IconChevronRight
                          style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={produto.id + "-details"}>
                        <td colSpan={6} style={{ background: "var(--cm-surface-alt)" }}>
                          {produto.variacoes.length === 0 ? (
                            <p className="cm-text-muted">Nenhuma cor cadastrada ainda.</p>
                          ) : (
                            produto.variacoes.map((v) => (
                              <div key={v.id} className="cm-cor-bloco" onClick={(e) => e.stopPropagation()}>
                                <div className="cm-cor-cabecalho">
                                  <div className="cm-image-upload">
                                    {v.imagemUrl ? (
                                      <img
                                        src={`${BASE_URL}${v.imagemUrl}`}
                                        alt={v.cor}
                                        className="cm-image-preview"
                                      />
                                    ) : (
                                      <div className="cm-image-preview cm-image-preview-empty" />
                                    )}
                                    <div>
                                      <strong>{v.cor}</strong>
                                      <div className="cm-text-muted">
                                        {v.grades.length} {v.grades.length === 1 ? "tamanho" : "tamanhos"}
                                        {" · "}
                                        {v.grades.reduce((total, g) => total + g.estoqueAtual, 0)} un
                                      </div>
                                    </div>
                                  </div>
                                  <div className="cm-acoes-cor">
                                    <label className="cm-file-button">
                                      {v.imagemUrl ? "Trocar foto" : "Adicionar foto"}
                                      <input
                                        className="cm-file-input-hidden"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleVariacaoImagemChange(produto.id, v.id, e.target.files[0])
                                        }
                                      />
                                    </label>
                                    <button
                                      className="cm-link-button"
                                      type="button"
                                      onClick={() => handleDeleteVariacao(produto.id, v.id)}
                                    >
                                      <IconTrash width={14} height={14} />
                                      Remover cor
                                    </button>
                                  </div>
                                </div>

                                <table className="cm-table">
                                  <thead>
                                    <tr>
                                      <th>Tamanho</th>
                                      <th>SKU</th>
                                      <th>Mínimo</th>
                                      <th>Estoque</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {v.grades.length === 0 ? (
                                      <tr>
                                        <td colSpan={5}>Nenhum tamanho nesta cor ainda.</td>
                                      </tr>
                                    ) : (
                                      v.grades.map((g) => (
                                        <tr key={g.id}>
                                          <td>{g.tamanho}</td>
                                          <td>{g.sku || "—"}</td>
                                          <td>{g.estoqueMinimo}</td>
                                          <td>{g.estoqueAtual}</td>
                                          <td>
                                            <button
                                              className="cm-link-button"
                                              type="button"
                                              onClick={() => handleDeleteGrade(produto.id, v.id, g.id)}
                                            >
                                              <IconTrash width={14} height={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>

                                <div className="cm-inline-form">
                                  <input
                                    className="cm-input"
                                    placeholder="Tamanho (P, M, 40...)"
                                    value={gradeForms[v.id]?.tamanho || ""}
                                    onChange={(e) => updateGradeForm(v.id, "tamanho", e.target.value)}
                                  />
                                  <input
                                    className="cm-input"
                                    placeholder="SKU (opcional)"
                                    value={gradeForms[v.id]?.sku || ""}
                                    onChange={(e) => updateGradeForm(v.id, "sku", e.target.value)}
                                  />
                                  <input
                                    className="cm-input"
                                    type="number"
                                    min="0"
                                    placeholder="Estoque mínimo"
                                    value={gradeForms[v.id]?.estoqueMinimo || ""}
                                    onChange={(e) => updateGradeForm(v.id, "estoqueMinimo", e.target.value)}
                                  />
                                  <button
                                    className="cm-button-outline"
                                    type="button"
                                    onClick={() => handleAddGrade(produto.id, v.id)}
                                  >
                                    Adicionar tamanho
                                  </button>
                                </div>
                              </div>
                            ))
                          )}

                          <div className="cm-inline-form" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="cm-input"
                              placeholder="Nova cor"
                              value={variacaoForms[produto.id]?.cor || ""}
                              onChange={(e) => updateVariacaoForm(produto.id, "cor", e.target.value)}
                            />
                            <button
                              className="cm-button-outline"
                              type="button"
                              onClick={() => handleAddVariacao(produto.id)}
                            >
                              Adicionar cor
                            </button>
                            <button
                              className="cm-link-button"
                              type="button"
                              onClick={() => handleDelete(produto.id)}
                            >
                              <IconTrash width={14} height={14} />
                              Remover produto
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
