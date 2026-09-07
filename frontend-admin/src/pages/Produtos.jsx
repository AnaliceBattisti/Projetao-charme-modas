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

const emptyVariacao = { cor: "", tamanho: "", sku: "" };

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
      [produtoId]: { ...(prev[produtoId] || emptyVariacao), [field]: value },
    }));
  }

  async function handleAddVariacao(produtoId) {
    const variacao = variacaoForms[produtoId] || emptyVariacao;
    setError(null);
    if (!variacao.cor.trim() || !variacao.tamanho.trim()) {
      setError("Preencha cor e tamanho antes de adicionar a variação.");
      return;
    }
    try {
      await api.post(`/produtos/${produtoId}/variacoes`, variacao);
      setVariacaoForms((prev) => ({ ...prev, [produtoId]: emptyVariacao }));
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
    if (!confirm("Remover esta variação?")) return;
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
                const estoqueTotal = produto.variacoes.reduce(
                  (sum, v) => sum + v.estoqueAtual,
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
                              {produto.marca || "sem marca"} · {produto.variacoes.length} variações
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
                          <table className="cm-table" style={{ marginBottom: 12 }}>
                            <thead>
                              <tr>
                                <th>Foto</th>
                                <th>Cor</th>
                                <th>Tamanho</th>
                                <th>SKU</th>
                                <th>Estoque</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {produto.variacoes.length === 0 ? (
                                <tr>
                                  <td colSpan={6}>Nenhuma variação ainda.</td>
                                </tr>
                              ) : (
                                produto.variacoes.map((v) => (
                                  <tr key={v.id}>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <div className="cm-image-upload">
                                        {v.imagemUrl ? (
                                          <img
                                            src={`${BASE_URL}${v.imagemUrl}`}
                                            alt=""
                                            className="cm-image-preview"
                                          />
                                        ) : (
                                          <div className="cm-image-preview cm-image-preview-empty" />
                                        )}
                                        <label className="cm-file-button">
                                          {v.imagemUrl ? "Trocar" : "Adicionar"}
                                          <input
                                            className="cm-file-input-hidden"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                              handleVariacaoImagemChange(
                                                produto.id,
                                                v.id,
                                                e.target.files[0]
                                              )
                                            }
                                          />
                                        </label>
                                      </div>
                                    </td>
                                    <td>{v.cor || "—"}</td>
                                    <td>{v.tamanho || "—"}</td>
                                    <td>{v.sku || "—"}</td>
                                    <td>{v.estoqueAtual}</td>
                                    <td>
                                      <button
                                        className="cm-link-button"
                                        type="button"
                                        onClick={() => handleDeleteVariacao(produto.id, v.id)}
                                      >
                                        <IconTrash width={14} height={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>

                          <div className="cm-inline-form" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="cm-input"
                              placeholder="Cor"
                              value={variacaoForms[produto.id]?.cor || ""}
                              onChange={(e) => updateVariacaoForm(produto.id, "cor", e.target.value)}
                            />
                            <input
                              className="cm-input"
                              placeholder="Tamanho"
                              value={variacaoForms[produto.id]?.tamanho || ""}
                              onChange={(e) => updateVariacaoForm(produto.id, "tamanho", e.target.value)}
                            />
                            <input
                              className="cm-input"
                              placeholder="SKU (opcional)"
                              value={variacaoForms[produto.id]?.sku || ""}
                              onChange={(e) => updateVariacaoForm(produto.id, "sku", e.target.value)}
                            />
                            <button
                              className="cm-button-outline"
                              type="button"
                              onClick={() => handleAddVariacao(produto.id)}
                            >
                              Adicionar variação
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
