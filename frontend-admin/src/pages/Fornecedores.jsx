import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { IconPlus, IconSearch, IconTrash, IconPencil } from "../icons.jsx";
import Modal from "../components/Modal.jsx";
import { formatCnpj, somenteDigitos } from "../format.js";

const emptyForm = {
  nomeRazaoSocial: "",
  cnpj: "",
  localizacao: "",
  categoria: "",
  telefone: "",
  email: "",
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  // id do fornecedor sendo editado; null = cadastrando um novo
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");

  function loadFornecedores() {
    setLoading(true);
    api
      .get("/fornecedores")
      .then(setFornecedores)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadFornecedores, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function abrirEdicao(fornecedor) {
    setEditandoId(fornecedor.id);
    setForm({
      nomeRazaoSocial: fornecedor.nomeRazaoSocial || "",
      cnpj: formatCnpj(fornecedor.cnpj || ""),
      localizacao: fornecedor.localizacao || "",
      categoria: fornecedor.categoria || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
    });
    setShowForm(true);
  }

  function fecharForm() {
    setShowForm(false);
    setEditandoId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    // O CNPJ sai daqui sem máscara: o banco guarda só dígitos.
    const dados = { ...form, cnpj: somenteDigitos(form.cnpj) };
    try {
      if (editandoId) await api.put(`/fornecedores/${editandoId}`, dados);
      else await api.post("/fornecedores", dados);
      fecharForm();
      loadFornecedores();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remover este fornecedor?")) return;
    try {
      await api.del(`/fornecedores/${id}`);
      loadFornecedores();
    } catch (err) {
      setError(err.message);
    }
  }

  const fornecedoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return fornecedores;
    // Busca por CNPJ compara só os dígitos, então tanto faz digitar com ou sem máscara.
    const digitos = somenteDigitos(termo);
    return fornecedores.filter(
      (f) =>
        f.nomeRazaoSocial.toLowerCase().includes(termo) ||
        (digitos && somenteDigitos(f.cnpj).includes(digitos))
    );
  }, [fornecedores, busca]);

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Fornecedores</h1>
          <p className="cm-page-subtitle">Empresas e distribuidoras que abastecem o estoque.</p>
        </div>
        <div className="cm-page-actions">
          <div className="cm-search">
            <IconSearch />
            <input
              placeholder="Buscar por nome ou CNPJ"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button className="cm-button-pill" onClick={abrirNovo}>
            <IconPlus width={14} height={14} />
            Novo fornecedor
          </button>
        </div>
      </div>

      {error && <p className="cm-error">{error}</p>}

      <Modal open={showForm} onClose={fecharForm} title={editandoId ? "Editar fornecedor" : "Novo fornecedor"}>
        <form className="cm-inline-form" onSubmit={handleSubmit}>
          <input
            className="cm-input"
            placeholder="Nome / razão social"
            value={form.nomeRazaoSocial}
            onChange={(e) => setForm({ ...form, nomeRazaoSocial: e.target.value })}
            required
          />
          <input
            className="cm-input"
            placeholder="00.000.000/0000-00"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
            maxLength={18}
            required
          />
          <input
            className="cm-input"
            placeholder="Localização"
            value={form.localizacao}
            onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
          />
          <input
            className="cm-input"
            placeholder="Categoria"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />
          <input
            className="cm-input"
            placeholder="Telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <input
            className="cm-input"
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <button className="cm-button-pill" type="submit">
            {editandoId ? "Salvar alterações" : "Adicionar"}
          </button>
        </form>
      </Modal>

      <div className="cm-card">
        {loading ? (
          <p>Carregando...</p>
        ) : fornecedoresFiltrados.length === 0 ? (
          <p>Nenhum fornecedor encontrado.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Nome / razão social</th>
                <th>CNPJ</th>
                <th>Localização</th>
                <th>Categoria</th>
                <th>Produtos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fornecedoresFiltrados.map((f) => (
                <tr key={f.id}>
                  <td>{f.nomeRazaoSocial}</td>
                  <td>{formatCnpj(f.cnpj) || "—"}</td>
                  <td>{f.localizacao || "—"}</td>
                  <td>{f.categoria || "—"}</td>
                  <td>{f._count?.produtos ?? 0}</td>
                  <td className="cm-acoes-linha">
                    <button className="cm-link-button" onClick={() => abrirEdicao(f)}>
                      <IconPencil width={14} height={14} />
                      Editar
                    </button>
                    <button className="cm-link-button" onClick={() => handleDelete(f.id)}>
                      <IconTrash width={14} height={14} />
                      Remover
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
