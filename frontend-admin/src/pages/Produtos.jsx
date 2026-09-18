import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, BASE_URL } from "../api.js";
import { IconPlus, IconSearch, IconChevronRight, IconTrash, IconImage } from "../icons.jsx";
import Modal from "../components/Modal.jsx";
import Paginacao from "../components/Paginacao.jsx";
import { formatCurrencyInput, parseCurrencyInput } from "../format.js";

const ITENS_POR_PAGINA = 10;

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
// Quantidade não se cadastra aqui: entra pela aba Estoque.
const emptyGradeForm = { tamanho: "", sku: "" };

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
  const [pagina, setPagina] = useState(1);

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
  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const produtosPaginados = produtosFiltrados.slice(
    (paginaAtual - 1) * ITENS_POR_PAGINA,
    paginaAtual * ITENS_POR_PAGINA
  );

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Produtos</h1>
          <p className="cm-page-subtitle">
            Cadastro do catálogo: cada produto tem cores (com foto) e os tamanhos de cada cor.
            As quantidades ficam em <Link to="/estoque">Estoque</Link>.
          </p>
        </div>
        <div className="cm-page-actions">
          <div className="cm-search">
            <IconSearch />
            <input
              placeholder="Buscar por nome ou marca"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
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
          onClick={() => {
            setCategoriaFiltro("Todos");
            setPagina(1);
          }}
        >
          Todos
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            className={"cm-filter-pill" + (categoriaFiltro === c ? " active" : "")}
            onClick={() => {
              setCategoriaFiltro(c);
              setPagina(1);
            }}
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produtosPaginados.map((produto) => {
                const capa = produto.variacoes.find((v) => v.imagemUrl)?.imagemUrl;
                const totalTamanhos = produto.variacoes.reduce((s, v) => s + v.grades.length, 0);
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
                            <div className="cm-thumb cm-thumb-placeholder" title="Sem foto">
                              <IconImage width={16} height={16} />
                            </div>
                          )}
                          <div>
                            <strong>{produto.nome}</strong>
                            <br />
                            <span className="cm-text-muted">
                              {produto.marca || "sem marca"} ·{" "}
                              {produto.variacoes.length} {produto.variacoes.length === 1 ? "cor" : "cores"} ·{" "}
                              {totalTamanhos} {totalTamanhos === 1 ? "tamanho" : "tamanhos"}
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
                      <td>
                        <IconChevronRight
                          style={{ transform: isExpanded ? "rotate(90deg)" : "none" }}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={produto.id + "-details"}>
                        <td colSpan={5} style={{ background: "var(--cm-surface-alt)" }}>
                          {produto.variacoes.length === 0 ? (
                            <p className="cm-text-muted">
                              Nenhuma cor cadastrada ainda. Comece adicionando uma cor abaixo — é nela
                              que entra a foto da peça.
                            </p>
                          ) : (
                            produto.variacoes.map((v) => (
                              <div key={v.id} className="cm-cor-bloco" onClick={(e) => e.stopPropagation()}>
                                <div className="cm-cor-cabecalho">
                                  <div className="cm-image-upload">
                                    {/* O próprio quadrado é o botão de foto: clicar abre o seletor. */}
                                    <label
                                      className={
                                        "cm-foto-alvo" + (v.imagemUrl ? " tem-foto" : "")
                                      }
                                      title={v.imagemUrl ? "Trocar a foto desta cor" : "Escolher a foto desta cor"}
                                    >
                                      {v.imagemUrl ? (
                                        <>
                                          <img src={`${BASE_URL}${v.imagemUrl}`} alt={v.cor} />
                                          <span className="cm-foto-overlay">Trocar</span>
                                        </>
                                      ) : (
                                        <span className="cm-foto-vazia">
                                          <IconImage width={20} height={20} />
                                          Adicionar foto
                                        </span>
                                      )}
                                      <input
                                        className="cm-file-input-hidden"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleVariacaoImagemChange(produto.id, v.id, e.target.files[0])
                                        }
                                      />
                                    </label>
                                    <div>
                                      <strong>{v.cor}</strong>
                                      <div className="cm-text-muted">
                                        {v.grades.length === 0
                                          ? "sem tamanhos"
                                          : v.grades.map((g) => g.tamanho).join(", ")}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="cm-acoes-cor">
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

                                {v.grades.length > 0 && (
                                  <table className="cm-table cm-tabela-tamanhos">
                                    <thead>
                                      <tr>
                                        <th>Tamanho</th>
                                        <th>SKU</th>
                                        <th></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {v.grades.map((g) => (
                                        <tr key={g.id}>
                                          <td>{g.tamanho}</td>
                                          <td>{g.sku || "—"}</td>
                                          <td>
                                            {/* Tamanho com peça em estoque não sai daqui: zera na aba Estoque. */}
                                            <button
                                              className="cm-link-button"
                                              type="button"
                                              disabled={g.estoqueAtual > 0}
                                              title={
                                                g.estoqueAtual > 0
                                                  ? `Tem ${g.estoqueAtual} peça(s) em estoque — zere em Estoque antes de remover`
                                                  : "Remover tamanho"
                                              }
                                              onClick={() => handleDeleteGrade(produto.id, v.id, g.id)}
                                            >
                                              <IconTrash width={14} height={14} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}

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
                                  <button
                                    className="cm-button-outline"
                                    type="button"
                                    onClick={() => handleAddGrade(produto.id, v.id)}
                                  >
                                    <IconPlus width={14} height={14} />
                                    Adicionar tamanho
                                  </button>
                                </div>
                              </div>
                            ))
                          )}

                          <div className="cm-rodape-produto" onClick={(e) => e.stopPropagation()}>
                            <div className="cm-inline-form">
                              <input
                                className="cm-input"
                                placeholder="Nova cor (ex.: Rosa)"
                                value={variacaoForms[produto.id]?.cor || ""}
                                onChange={(e) => updateVariacaoForm(produto.id, "cor", e.target.value)}
                              />
                              <button
                                className="cm-button-pill"
                                type="button"
                                onClick={() => handleAddVariacao(produto.id)}
                              >
                                <IconPlus width={14} height={14} />
                                Adicionar cor
                              </button>
                            </div>
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
        {!loading && (
          <Paginacao
            pagina={paginaAtual}
            totalItens={produtosFiltrados.length}
            itensPorPagina={ITENS_POR_PAGINA}
            onMudarPagina={setPagina}
            label="Paginação de produtos"
          />
        )}
      </div>
    </div>
  );
}
