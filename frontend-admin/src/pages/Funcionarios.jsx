import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useSessao } from "../auth.jsx";
import { IconPlus, IconTrash, IconPencil } from "../icons.jsx";
import Modal from "../components/Modal.jsx";

const emptyForm = { nome: "", email: "", senha: "", papel: "OPERADOR" };

const PAPEIS = [
  { valor: "OPERADOR", label: "Operador", descricao: "Usa o painel no dia a dia: vendas, estoque, clientes." },
  { valor: "ADMIN", label: "Administrador", descricao: "Tudo do operador e mais: cadastrar e remover funcionários." },
];

const PAPEL_BADGE = { ADMIN: "cm-badge-purple", OPERADOR: "cm-badge-blue" };

export default function Funcionarios() {
  const { funcionario: eu } = useSessao();
  const [funcionarios, setFuncionarios] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editandoId, setEditandoId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function carregar() {
    setLoading(true);
    api
      .get("/painel/funcionarios")
      .then(setFuncionarios)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(carregar, []);

  function abrirNovo() {
    setEditandoId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  }

  function abrirEdicao(f) {
    setEditandoId(f.id);
    // A senha fica em branco: só é enviada se a pessoa digitar uma nova.
    setForm({ nome: f.nome, email: f.email, senha: "", papel: f.papel });
    setError(null);
    setShowForm(true);
  }

  function fechar() {
    setShowForm(false);
    setEditandoId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      if (editandoId) {
        const dados = { nome: form.nome, papel: form.papel };
        if (form.senha) dados.senha = form.senha;
        await api.put(`/painel/funcionarios/${editandoId}`, dados);
      } else {
        await api.post("/painel/funcionarios", form);
      }
      fechar();
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(f) {
    if (!confirm(`Remover o acesso de ${f.nome}?`)) return;
    setError(null);
    try {
      await api.del(`/painel/funcionarios/${f.id}`);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Funcionários</h1>
          <p className="cm-page-subtitle">
            Quem pode entrar no painel da loja. Cada pessoa tem o próprio login.
          </p>
        </div>
        <div className="cm-page-actions">
          <button className="cm-button-pill" onClick={abrirNovo}>
            <IconPlus width={14} height={14} />
            Novo funcionário
          </button>
        </div>
      </div>

      {error && <p className="cm-error">{error}</p>}

      <Modal
        open={showForm}
        onClose={fechar}
        title={editandoId ? "Editar funcionário" : "Novo funcionário"}
      >
        <form className="cm-inline-form" onSubmit={handleSubmit}>
          <input
            className="cm-input"
            placeholder="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <input
            className="cm-input"
            type="email"
            placeholder="E-mail de acesso"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            // O e-mail identifica a conta; trocar viraria outra pessoa.
            disabled={Boolean(editandoId)}
            required
          />
          <input
            className="cm-input"
            type="password"
            placeholder={editandoId ? "Nova senha (deixe vazio para manter)" : "Senha (mínimo 8 caracteres)"}
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            minLength={editandoId && !form.senha ? undefined : 8}
            required={!editandoId}
          />
          <select
            className="cm-input"
            value={form.papel}
            onChange={(e) => setForm({ ...form, papel: e.target.value })}
          >
            {PAPEIS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.label}
              </option>
            ))}
          </select>
          <p className="cm-text-muted" style={{ width: "100%", margin: 0 }}>
            {PAPEIS.find((p) => p.valor === form.papel)?.descricao}
          </p>
          <button className="cm-button-pill" type="submit">
            {editandoId ? "Salvar alterações" : "Criar acesso"}
          </button>
        </form>
      </Modal>

      <div className="cm-card">
        {loading ? (
          <p>Carregando...</p>
        ) : funcionarios.length === 0 ? (
          <p>Nenhum funcionário cadastrado.</p>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {funcionarios.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>{f.nome}</strong>
                    {f.id === eu?.id && <span className="cm-text-muted"> · você</span>}
                  </td>
                  <td>{f.email}</td>
                  <td>
                    <span className={"cm-badge " + (PAPEL_BADGE[f.papel] || "cm-badge-gray")}>
                      {PAPEIS.find((p) => p.valor === f.papel)?.label || f.papel}
                    </span>
                  </td>
                  <td>{new Date(f.criadoEm).toLocaleDateString("pt-BR")}</td>
                <td>
                  <div className="cm-acoes-linha">
                    <button className="cm-link-button" onClick={() => abrirEdicao(f)}>
                      <IconPencil width={14} height={14} />
                      Editar
                    </button>
                    <button
                      className="cm-link-button"
                      onClick={() => handleDelete(f)}
                      disabled={f.id === eu?.id}
                      title={f.id === eu?.id ? "Você não pode remover a sua própria conta" : "Remover acesso"}
                    >
                      <IconTrash width={14} height={14} />
                      Remover
                    </button>
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
