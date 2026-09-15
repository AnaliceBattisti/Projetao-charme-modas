import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { IconPlus, IconTrash } from "../icons.jsx";
import Modal from "../components/Modal.jsx";
import {
  emptyCliente, emptyEndereco, estados, formatCpf, formatCep, formatTelefone, formatTelefoneInput,
  moeda, data, mensagemErro, normalizarBusca, situacaoCredito, parcelaAtrasada, resumirCompras,
} from "../clientesUtils.js";

const PAGE_SIZE = 8;
const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Separado(a)", "Viúvo(a)", "União estável"];
const FORM_GRID = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px 20px" };
const FIELDSET = { border: 0, padding: 0, margin: 0, minWidth: 0 };
const ACTIONS = { justifyContent: "flex-end", gap: 18, marginTop: 28 };

// Ajustes visuais do Figma sobre os componentes e as cores compartilhados do projeto.
const visual = {
  page: {
    "--cm-border": "#e8dde3", "--cm-text-muted": "#756b71", "--cm-plum": "var(--cm-texto)",
    fontFamily: '"Inter", "Segoe UI", sans-serif', color: "var(--cm-texto)",
    background: "#f7f3f6", margin: "-32px -40px", padding: "44px 54px 44px 38px", minHeight: "100vh",
  },
  title: { fontSize: 28, lineHeight: "34px", color: "var(--cm-texto)", margin: 0 },
  subtitle: { fontSize: 13, lineHeight: "16px", marginTop: 6 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 26 },
  search: { flex: "0 1 430px", minWidth: "min(100%, 240px)" },
  searchInput: { width: "100%", height: 42, padding: "12px 20px", borderRadius: 10, fontFamily: "inherit", fontSize: 12 },
  button: { borderRadius: 10, minHeight: 44, padding: "10px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, justifyContent: "center" },
  outline: { borderRadius: 10, minHeight: 44, padding: "10px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, justifyContent: "center", background: "var(--cm-blush)", color: "var(--cm-vinho)" },
  link: { color: "var(--cm-vinho)", fontFamily: "inherit", fontSize: 12 },
  list: { padding: 0, minHeight: 704, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" },
  table: { minWidth: 970, tableLayout: "fixed" },
  th: { height: 40, padding: "24px 24px 0", border: 0, fontSize: 11, fontWeight: 600 },
  td: { height: 112, padding: "20px 24px", border: 0, fontSize: 11, overflowWrap: "anywhere" },
  name: { display: "block", fontSize: 12, lineHeight: "19px", fontWeight: 600 },
  cpf: { fontSize: 10, marginTop: 7 },
  footer: { margin: "auto 0 0", padding: "20px 24px", alignItems: "center", borderTop: "1px solid var(--cm-border)" },
  empty: { padding: "64px 24px", textAlign: "center", margin: "auto", maxWidth: 560 },
  modal: { width: "min(820px, 100%)", padding: "28px 32px 32px", borderRadius: 20, border: "1px solid var(--cm-border)", maxHeight: "calc(100dvh - 48px)" },
  modalTitle: { display: "block", fontSize: 24, lineHeight: "31px", color: "var(--cm-texto)" },
  description: { fontSize: 12, lineHeight: "20px", color: "var(--cm-text-muted)", margin: "0 0 16px" },
  sectionTitle: { fontSize: 14, lineHeight: "18px", color: "var(--cm-texto)", margin: "0 0 14px" },
  label: { display: "block", minWidth: 0, margin: 0, fontSize: 11, lineHeight: "14px", color: "var(--cm-texto)" },
  input: { display: "block", height: 40, margin: "6px 0 0", background: "white", fontFamily: "inherit", fontSize: 12, fontWeight: 400 },
};


const STATUS_BADGE = {
  PENDENTE: "cm-badge-yellow",
  ATRASADA: "cm-badge-red",
  PAGA: "cm-badge-green",
  CANCELADA: "cm-badge-gray",
};

// Listagem e ações do cadastro. Formulários e perfil ficam abaixo, nesta mesma página.
export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [compras, setCompras] = useState(null);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comprasError, setComprasError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [profileReload, setProfileReload] = useState(0);
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);

  const [parcelaEmFoco, setParcelaEmFoco] = useState(null);
  const [showParcelaModal, setShowParcelaModal] = useState(false);
  const [loadingRegisterParcela, setLoadingRegisterParcela] = useState(false);
  const [errorRegisterParcela, setErrorRegisterParcela] = useState(false);
  const intlCurr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setComprasError("");
    Promise.allSettled([
      api.get("/clientes", { signal: controller.signal }),
      api.get("/compras", { signal: controller.signal }),
    ]).then(([cadastros, historico]) => {
      if (controller.signal.aborted) return;
      if (cadastros.status === "fulfilled") setClientes(cadastros.value);
      else setError(mensagemErro(cadastros.reason));
      if (historico.status === "fulfilled") setCompras(historico.value);
      else {
        setCompras(null);
        setComprasError("Não foi possível carregar o resumo de compras. Os cadastros continuam disponíveis.");
      }
      setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const resumo = useMemo(() => resumirCompras(compras || []), [compras]);
  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    const digitos = termo.replace(/\D/g, "");
    return clientes.filter((cliente) =>
      normalizarBusca(cliente.nome).includes(termo) ||
      (digitos && /^[\d.\s()+-]+$/.test(termo) && (
        cliente.cpf.replace(/\D/g, "").includes(digitos) ||
        cliente.telefone?.replace(/\D/g, "").includes(digitos)
      ))
    );
  }, [clientes, busca]);
  const pages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visiveis = filtrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function abrir(type, cliente) {
    setModalError("");
    setNotice("");
    setModal({ type, cliente });
  }

  function fechar() {
    if (busy) return;
    setModal(null);
    setModalError("");
  }

  function atualizar(cliente) {
    setClientes((prev) => [...prev.filter((item) => item.id !== cliente.id), cliente]
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id));
  }

  async function salvar(payload) {
    setBusy(true);
    setModalError("");
    try {
      const cliente = modal.type === "edit"
        ? await api.put(`/clientes/${modal.cliente.id}`, payload)
        : await api.post("/clientes", payload);
      atualizar(cliente);
      setNotice(modal.type === "edit"
        ? "Cadastro atualizado com sucesso."
        : "Cliente cadastrado com sucesso. O crediário foi criado automaticamente.");
      setModal(null);
    } catch (err) {
      setModalError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  async function excluir() {
    setBusy(true);
    setModalError("");
    try {
      await api.del(`/clientes/${modal.cliente.id}`);
      setClientes((prev) => prev.filter((cliente) => cliente.id !== modal.cliente.id));
      setNotice("Cliente excluído com sucesso.");
      setModal(null);
    } catch (err) {
      setModalError(mensagemErro(err));
    } finally {
      setBusy(false);
    }
  }

  const handleAbrirParcelaModal = (parcelas, parcelaId, cliente) => {
    const parcela = parcelas.find(p=>p.id == parcelaId);
    setLoadingRegisterParcela(false);
    setErrorRegisterParcela(false);

    if(parcela){
      parcela.total = parcelas.length;
      parcela.cliente = cliente;
      setParcelaEmFoco(parcela);
      setShowParcelaModal(true);
    }
  };


  const handleFecharParcelaModal = () => {
    setShowParcelaModal(false);
    setParcelaEmFoco(null);
    setLoadingRegisterParcela(false);
    setErrorRegisterParcela(false);
  };

  async function handleRegistrarPagamento(e) {
    e.preventDefault();
    setErrorRegisterParcela(false);
    setLoadingRegisterParcela(true);
    try {
      await api.put(`/parcelas/baixa/${parcelaEmFoco.id}`);
      handleFecharParcelaModal();
      setReload((prev) => prev + 1);
      setProfileReload((prev) => prev + 1);
    } catch (err) {
      console.log(err)
      setErrorRegisterParcela(true);
    }
  }

  return (
    <div style={visual.page}>
      <div className="cm-page-header" style={{ marginBottom: 22 }}>
        <div>
          <h1 className="cm-page-title" style={visual.title}>Clientes</h1>
          <p className="cm-page-subtitle" style={visual.subtitle}>Cadastro e histórico de compras</p>
        </div>
      </div>
      <div style={visual.toolbar}>
        <div className="cm-search" style={visual.search}>
          <input type="search" aria-label="Buscar clientes por nome, CPF ou telefone" style={visual.searchInput}
            placeholder="Buscar por nome, CPF ou telefone..." maxLength={150} value={busca}
            onChange={(event) => { setBusca(event.target.value); setPage(1); }} />
        </div>
        <button className="cm-button-pill" style={{ ...visual.button, minWidth: 166, minHeight: 42 }} onClick={() => abrir("create")}>
          <IconPlus width={14} height={14} aria-hidden="true" /> Novo cliente
        </button>
      </div>
      {notice && (
        <div className="cm-page-header" role="status">
          <p style={{ margin: 0 }}>{notice}</p>
          <button className="cm-link-button" style={visual.link} aria-label="Fechar mensagem" onClick={() => setNotice("")}>Fechar</button>
        </div>
      )}
      {comprasError && !error && (
        <div className="cm-error" role="alert">
          <p>{comprasError}</p>
          <button className="cm-link-button" style={visual.link} onClick={() => setReload(reload + 1)}>Tentar novamente</button>
        </div>
      )}
      <section className="cm-card" style={visual.list} aria-label="Lista de clientes" aria-busy={loading}>
        {loading ? <p role="status" style={visual.empty}>Carregando clientes...</p> : error ? (
          <div className="cm-error" role="alert">
            <h2 className="cm-section-title">Não foi possível carregar os clientes</h2>
            <p>{error}</p>
            <button className="cm-link-button" style={visual.link} onClick={() => setReload(reload + 1)}>Tentar novamente</button>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={visual.empty}>
            <h2 className="cm-section-title">{busca ? "Nenhum cliente encontrado" : "Seu primeiro cliente começa aqui"}</h2>
            <p className="cm-text-muted">{busca ? "Tente buscar por outro nome, CPF ou telefone." : "Cadastre um cliente para acompanhar seus contatos, compras e crediário."}</p>
            <button className="cm-button-outline" style={visual.outline} onClick={() => busca ? setBusca("") : abrir("create")}>
              {busca ? "Limpar busca" : "Cadastrar primeiro cliente"}
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
            <table className="cm-table" style={visual.table} aria-label="Clientes cadastrados, contatos e resumo de compras">
              <colgroup>{[26, 19, 10, 13, 18, 14].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
              <thead><tr>{["Cliente", "Contato", "Compras", "Crediário", "Última compra", "Ações"].map((label) => <th style={visual.th} scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{visiveis.map((cliente) => {
                const historico = resumo.get(cliente.id);
                return (
                  <tr key={cliente.id}>
                    <td style={visual.td}><strong style={visual.name}>{cliente.nome}</strong><div className="cm-text-muted" style={visual.cpf}>CPF ***.***.***-**</div></td>
                    <td style={visual.td}>{formatTelefone(cliente.telefone)}</td>
                    <td style={{ ...visual.td, fontSize: 12, fontWeight: 600 }}>{compras ? (historico?.quantidade || 0) : "—"}</td>
                    <td style={visual.td}><StatusCrediario crediario={cliente.crediario} atrasado={historico?.atrasado} /></td>
                    <td style={visual.td}>{compras ? (historico?.ultima ? data(historico.ultima) : "Sem compras") : "—"}</td>
                    <td style={visual.td}><button className="cm-link-button" style={{ ...visual.link, fontSize: 11, fontWeight: 600, textDecoration: "none", padding: "8px 0" }} aria-label={`Ver perfil de ${cliente.nome}`} onClick={() => abrir("profile", cliente)}>Ver perfil</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            </div>
            <footer className="cm-page-header" style={visual.footer}>
              <span className="cm-text-muted" style={{ fontSize: 12 }} aria-live="polite">{filtrados.length} {filtrados.length === 1 ? "cliente" : "clientes"}{busca ? " encontrados" : " cadastrados"}</span>
              {pages > 1 && (
                <nav className="cm-page-actions" aria-label="Paginação de clientes">
                  <button className="cm-button-outline" style={visual.outline} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
                  <span className="cm-text-muted">{currentPage} de {pages}</span>
                  <button className="cm-button-outline" style={visual.outline} disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Próxima</button>
                </nav>
              )}
            </footer>
          </>
        )}
      </section>
      {modal && (
        <Modal key={`${modal.type}-${modal.cliente?.id || "novo"}`} open onClose={fechar}
          style={{ ...visual.modal, ...(modal.type === "delete" ? { width: "min(520px, 100%)" } : {}) }}
          title={<span style={visual.modalTitle}>{({ create: "Novo cliente", edit: "Editar cliente", profile: "Perfil do cliente", delete: "Excluir cliente" })[modal.type]}</span>}>
          {["create", "edit"].includes(modal.type) && <ClienteForm cliente={modal.cliente} onSave={salvar} onCancel={fechar} busy={busy} error={modalError} />}
          {modal.type === "profile" && <ClientePerfil id={modal.cliente.id} onEdit={(cliente) => abrir("edit", cliente)} onDelete={(cliente) => abrir("delete", cliente)} onUpdate={atualizar} busy={busy} onBusy={setBusy} handleAbrirParcelaModal={handleAbrirParcelaModal} onRefresh={profileReload}/>}
          {modal.type === "delete" && (
            <div>
              <p>Deseja excluir <strong>{modal.cliente.nome}</strong>?</p>
              <p className="cm-text-muted">O cadastro, a conta de acesso, o crediário e os endereços serão removidos. Clientes com compras registradas, mesmo quitadas, não podem ser excluídos.</p>
              <ErroFormulario error={modalError} />
              <div className="cm-page-actions" style={ACTIONS}>
                <button className="cm-button-outline" style={visual.outline} disabled={busy} onClick={fechar}>Cancelar</button>
                <button className="cm-button-pill" style={visual.button} disabled={busy} onClick={excluir}>
                  <IconTrash width={14} height={14} aria-hidden="true" /> {busy ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      <Modal open={showParcelaModal} onClose={() => { setShowParcelaModal(false); setParcelaEmFoco(null) }} title="Confirmar Pagamento">
        <div style={{ marginTop: "12px" }}>
          {errorRegisterParcela && <div className="cm-error">Error inesperado ao dar baixa em parcela, contate operador.</div>}

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
                  "cm-badge " + (STATUS_BADGE[parcelaEmFoco?.status] || "cm-badge-gray")
                }
              >
                {parcelaEmFoco?.status}
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
                  {`${parcelaEmFoco?.numero}/${parcelaEmFoco?.total}`}
                </div>
              </div>

              <div>
                <label className="cm-label" style={{ marginBottom: "2px" }}>
                  Vencimento
                </label>
                <div>
                  {new Date(parcelaEmFoco?.dataVencimento).toLocaleDateString("pt-BR", {
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
              {intlCurr.format(parcelaEmFoco?.valor)}
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
              onClick={handleFecharParcelaModal}
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
              {loadingRegisterParcela ? "Processando..." : "Confirmar Baixa"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Elementos usados pelo cadastro e pelo perfil.
function StatusCrediario({ crediario, atrasado }) {
  const status = situacaoCredito(crediario, atrasado);
  const colors = { success: "#2f7d5c", danger: "#b54747", warning: "#b7791f", muted: "var(--cm-text-muted)" };
  return <span style={{ color: colors[status.color], fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{status.label}</span>;
}

function ErroFormulario({ error }) {
  const message = useRef(null);
  useEffect(() => { if (error) message.current?.focus(); }, [error]);
  return error ? <p ref={message} className="cm-error" role="alert" tabIndex={-1}>{error}</p> : null;
}

function Campo({ label, options, ...props }) {
  return (
    <label className="cm-label" style={visual.label}>
      {label}{props.required && " *"}
      {options ? (
        <select className="cm-input" {...props} style={{ ...visual.input, cursor: "pointer", paddingRight: 28, color: props.value ? "var(--cm-texto)" : "var(--cm-text-muted)" }}>
          {options.map((value) => <option key={value} value={value}>{value || "Não informado"}</option>)}
        </select>
      ) : (
        <input className="cm-input" {...props} style={{ ...visual.input, ...(props.readOnly ? { background: "var(--cm-blush)", color: "var(--cm-text-muted)" } : {}) }} />
      )}
    </label>
  );
}

function EnderecoFields({ value, onChange }) {
  const id = useId();
  const fields = [
    ["cep", "CEP", { placeholder: "00000-000", maxLength: 9, inputMode: "numeric", pattern: "[0-9]{5}-?[0-9]{3}" }],
    ["logradouro", "Logradouro", { placeholder: "Rua, avenida...", autoComplete: "address-line1" }],
    ["numero", "Número", { placeholder: "100 ou s/n", maxLength: 20 }],
    ["bairro", "Bairro", {}],
    ["cidade", "Cidade", { autoComplete: "address-level2" }],
    ["complemento", "Complemento", { placeholder: "Apartamento, referência...", autoComplete: "address-line2" }],
  ];
  return (
    <div style={FORM_GRID}>
      {fields.map(([name, label, options]) => (
        <Campo key={name} label={label} id={`${id}-${name}`} name={name} value={value[name] ?? ""}
          required={name !== "complemento"} maxLength={150} {...options}
          onChange={(event) => onChange({ ...value, [name]: name === "cep" ? formatCep(event.target.value) : event.target.value })} />
      ))}
      <label className="cm-label" style={visual.label} htmlFor={`${id}-estado`}>UF *
        <select className="cm-input" id={`${id}-estado`} required value={value.estado}
          style={visual.input} onChange={(event) => onChange({ ...value, estado: event.target.value })}>
          <option value="">Selecione</option>{estados.map((uf) => <option key={uf}>{uf}</option>)}
        </select>
      </label>
    </div>
  );
}

function ClienteForm({ cliente, onSave, onCancel, busy, error }) {
  const [form, setForm] = useState(() => Object.fromEntries(Object.keys(emptyCliente).map((key) => [key, cliente?.[key] ?? ""])));
  const [enderecos, setEnderecos] = useState([]);
  const fields = [
    ["nome", "Nome completo", { required: true, placeholder: "Nome do cliente", autoComplete: "name", "data-autofocus": true }],
    ["cpf", "CPF", { required: true, placeholder: "000.000.000-00", inputMode: "numeric", maxLength: 14, pattern: "[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}" }],
    ["telefone", "Telefone", { type: "tel", placeholder: "(87) 99999-0000", autoComplete: "tel", maxLength: 30 }],
    ["email", "E-mail", { type: "email", placeholder: "cliente@email.com", autoComplete: "email", maxLength: 254 }],
    ["idade", "Idade", { type: "number", min: 0, max: 130, step: 1, placeholder: "Anos" }],
    ["profissao", "Profissão", { placeholder: "Profissão do cliente" }],
    ["estadoCivil", "Estado civil", {}],
  ];

  function atualizarTelefone(event) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitosAntes = input.value.slice(0, cursor).replace(/\D/g, "").length;
    const telefone = formatTelefoneInput(input.value);
    let position = telefone.length;
    if (cursor < input.value.length) {
      const indices = [...telefone.matchAll(/\d/g)];
      position = digitosAntes ? (indices[digitosAntes - 1]?.index ?? telefone.length - 1) + 1 : 0;
    }
    setForm((prev) => ({ ...prev, telefone }));
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.setSelectionRange(position, position);
    });
  }

  function renderField([name, label, options]) {
    if (name === "estadoCivil") {
      const values = ["", ...ESTADOS_CIVIS];
      // Preserva valores de cadastros antigos até o usuário escolher outra opção.
      if (form.estadoCivil && !values.includes(form.estadoCivil)) values.push(form.estadoCivil);
      return <Campo key={name} label={label} name={name} options={values} value={form.estadoCivil}
        onChange={(event) => setForm({ ...form, estadoCivil: event.target.value })} />;
    }
    return <Campo key={name} label={label} name={name} maxLength={150} {...options}
      value={name === "cpf" ? formatCpf(form[name]) : name === "telefone" ? formatTelefoneInput(form[name]) : form[name]}
      onChange={name === "telefone" ? atualizarTelefone : (event) => setForm({ ...form, [name]: name === "cpf" ? formatCpf(event.target.value) : event.target.value })} />;
  }

  function submit(event) {
    event.preventDefault();
    const payload = { ...form, idade: form.idade === "" ? null : Number(form.idade) };
    if (!cliente) payload.enderecos = enderecos.map(({ key, ...endereco }) => endereco);
    onSave(payload);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", minHeight: 610 }}>
      <p className="cm-text-muted" style={{ ...visual.description, margin: "-10px 0 32px" }}>Dados pessoais, contato e endereços de entrega. Campos com * são obrigatórios.</p>
      <ErroFormulario error={error} />
      <fieldset disabled={busy} style={FIELDSET} aria-label="Dados do cliente">
        <div style={{ ...FORM_GRID, marginBottom: 16 }}>{fields.slice(0, 4).map(renderField)}</div>
        <div style={{ ...FORM_GRID, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))" }}>{fields.slice(4).map(renderField)}</div>
        {!cliente ? (
          <section style={{ marginTop: 24 }}>
            <div className="cm-page-header" style={{ marginBottom: 12 }}>
              <h3 className="cm-section-title" style={{ ...visual.sectionTitle, margin: 0 }}>Endereços de entrega</h3>
              <button type="button" className="cm-link-button" style={visual.link} disabled={enderecos.length >= 20}
                onClick={() => setEnderecos([...enderecos, { ...emptyEndereco, key: crypto.randomUUID() }])}>
                <IconPlus width={14} height={14} aria-hidden="true" /> Adicionar endereço
              </button>
            </div>
            {enderecos.length === 0 && <p className="cm-text-muted" style={{ ...visual.description, margin: 0 }}>Opcional. Você também pode adicionar endereços depois do cadastro.</p>}
            {enderecos.map((endereco, index) => (
              <fieldset className="cm-card" style={{ margin: "16px 0", minWidth: 0 }} key={endereco.key}>
                <legend className="cm-label">Endereço {index + 1}</legend>
                <EnderecoFields value={endereco} onChange={(value) => setEnderecos(enderecos.map((item) => item.key === endereco.key ? value : item))} />
                <button type="button" className="cm-link-button" style={visual.link} onClick={() => setEnderecos(enderecos.filter((item) => item.key !== endereco.key))}>
                  <IconTrash width={14} height={14} aria-hidden="true" /> Remover endereço {index + 1}
                </button>
              </fieldset>
            ))}
          </section>
        ) : <p className="cm-text-muted" style={{ ...visual.description, marginTop: 20 }}>Gerencie os endereços na aba Endereços do perfil.</p>}
        <section style={{ marginTop: 24 }}>
          <h3 className="cm-section-title" style={visual.sectionTitle}>Crediário</h3>
          <div style={{ ...FORM_GRID, maxWidth: 470, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))" }}>
            <Campo label="Limite de crédito" readOnly value={cliente ? (cliente.crediario ? moeda(cliente.crediario.limiteCredito) : "Sem crediário") : "Definido pela loja"} />
            <Campo label="Status do crediário" readOnly value={cliente ? (cliente.crediario?.status === "ATIVO" ? "Ativo" : cliente.crediario ? "Bloqueado" : "Sem crediário") : "Ativo após o cadastro"} />
          </div>
          <p className="cm-text-muted" style={{ ...visual.description, margin: "20px 0 0" }}>
            {cliente ? "A edição dos dados pessoais preserva o limite e o status do crediário." : "O crediário será criado automaticamente com o limite inicial da loja."} O histórico de compras será preenchido automaticamente.
          </p>
        </section>
      </fieldset>
      <div className="cm-page-actions" style={{ ...ACTIONS, marginTop: "auto", paddingTop: 32 }}>
        <button type="button" className="cm-button-outline" style={visual.outline} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="cm-button-pill" style={visual.button} disabled={busy}>{busy ? "Salvando..." : "Salvar cliente"}</button>
      </div>
    </form>
  );
}

// Perfil: dados pessoais, endereços, histórico e consulta do crediário.
function ClientePerfil({ id, onEdit, onDelete, onUpdate, busy, onBusy, handleAbrirParcelaModal, onRefresh }) {
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("cadastro");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setCliente(null);
    api.get(`/clientes/${id}`, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setCliente(value); })
      .catch((err) => { if (!controller.signal.aborted) setError(mensagemErro(err)); });
    return () => controller.abort();
  }, [id, reload, onRefresh]);

  if (error) return <div className="cm-error" role="alert"><p>{error}</p><button className="cm-link-button" style={visual.link} onClick={() => setReload(reload + 1)}>Tentar novamente</button></div>;
  if (!cliente) return <p role="status">Carregando perfil...</p>;
  const tabs = [["cadastro", "Cadastro"], ["enderecos", `Endereços (${cliente.enderecos.length})`], ["compras", `Compras (${cliente.compras.length})`], ["credito", "Crediário"]];
  const atrasado = cliente.compras.some((compra) => compra.parcelas.some(parcelaAtrasada));
  const dados = [
    ["Nome completo", cliente.nome], ["CPF", formatCpf(cliente.cpf)], ["Telefone", formatTelefone(cliente.telefone)],
    ["E-mail", cliente.email], ["Idade", cliente.idade == null ? null : `${cliente.idade} anos`],
    ["Profissão", cliente.profissao], ["Estado civil", cliente.estadoCivil],
  ];

  return (
    <div>
      <div className="cm-page-header">
        <div><h3 className="cm-section-title" style={{ marginBottom: 4 }}>{cliente.nome}</h3><span className="cm-text-muted">CPF {formatCpf(cliente.cpf)}</span></div>
        <StatusCrediario crediario={cliente.crediario} atrasado={atrasado} />
      </div>
      <div className="cm-filter-row" role="tablist" aria-label="Informações do cliente">
        {tabs.map(([key, label], index) => (
          <button key={key} className={`cm-filter-pill${tab === key ? " active" : ""}`}
            id={`cliente-tab-${key}`} type="button" role="tab" aria-selected={tab === key} aria-controls="cliente-panel"
            tabIndex={tab === key ? 0 : -1} disabled={busy} onClick={() => setTab(key)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              setTab(tabs[next][0]);
              document.getElementById(`cliente-tab-${tabs[next][0]}`).focus();
            }}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id="cliente-panel" aria-labelledby={`cliente-tab-${tab}`} tabIndex={0}>
        {tab === "cadastro" && (
          <section>
            <h3 className="cm-section-title">Dados pessoais</h3>
            <dl style={{ ...FORM_GRID, rowGap: 16 }}>
              {dados.map(([label, value]) => <div key={label}><dt className="cm-text-muted">{label}</dt><dd style={{ margin: "4px 0 0", overflowWrap: "anywhere" }}>{value ?? "Não informado"}</dd></div>)}
            </dl>
            <div className="cm-page-actions" style={ACTIONS}>
              <button className="cm-button-outline" style={visual.outline} onClick={() => onEdit(cliente)}>Editar cadastro</button>
              <button className="cm-link-button" style={visual.link} onClick={() => onDelete(cliente)}><IconTrash width={14} height={14} aria-hidden="true" /> Excluir cliente</button>
            </div>
          </section>
        )}
        {tab === "enderecos" && <ClienteEnderecos cliente={cliente} onChange={(value) => { setCliente(value); onUpdate(value); }} busy={busy} onBusy={onBusy} />}
        {tab === "compras" && <HistoricoCompras cliente={cliente} compras={cliente.compras} handleAbrirParcelaModal={handleAbrirParcelaModal}/>}
        {tab === "credito" && <CreditoCliente cliente={cliente} />}
      </div>
    </div>
  );
}

function ClienteEnderecos({ cliente, onChange, busy, onBusy }) {
  const [editor, setEditor] = useState(null);
  const [remover, setRemover] = useState(null);
  const [error, setError] = useState("");

  function editar(endereco) {
    setError("");
    setRemover(null);
    setEditor({ ...endereco });
  }

  async function salvar(event) {
    event.preventDefault();
    setError("");
    onBusy(true);
    try {
      const payload = Object.fromEntries(Object.keys(emptyEndereco).map((key) => [key, editor[key] ?? ""]));
      const path = `/clientes/${cliente.id}/enderecos`;
      const endereco = editor.id ? await api.put(`${path}/${editor.id}`, payload) : await api.post(path, payload);
      onChange({ ...cliente, enderecos: editor.id ? cliente.enderecos.map((item) => item.id === editor.id ? endereco : item) : [...cliente.enderecos, endereco] });
      setEditor(null);
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      onBusy(false);
    }
  }

  async function excluir() {
    setError("");
    onBusy(true);
    try {
      await api.del(`/clientes/${cliente.id}/enderecos/${remover}`);
      onChange({ ...cliente, enderecos: cliente.enderecos.filter((item) => item.id !== remover) });
      setRemover(null);
    } catch (err) {
      setError(mensagemErro(err));
    } finally {
      onBusy(false);
    }
  }

  return (
    <section>
      <div className="cm-page-header">
        <h3 className="cm-section-title" style={{ margin: 0 }}>Endereços de entrega</h3>
        {!editor && <button className="cm-button-outline" style={visual.outline} disabled={busy} onClick={() => editar(emptyEndereco)}><IconPlus width={14} height={14} aria-hidden="true" /> Adicionar endereço</button>}
      </div>
      <ErroFormulario error={error} />
      {editor && (
        <form className="cm-card" onSubmit={salvar} style={{ marginBottom: 16 }}>
          <h4 className="cm-section-title">{editor.id ? "Editar endereço" : "Novo endereço"}</h4>
          <fieldset disabled={busy} style={FIELDSET} aria-label="Dados do endereço"><EnderecoFields value={editor} onChange={setEditor} /></fieldset>
          <div className="cm-page-actions" style={ACTIONS}>
            <button type="button" className="cm-button-outline" style={visual.outline} disabled={busy} onClick={() => { setEditor(null); setError(""); }}>Cancelar endereço</button>
            <button type="submit" className="cm-button-pill" style={visual.button} disabled={busy}>{busy ? "Salvando..." : "Salvar endereço"}</button>
          </div>
        </form>
      )}
      {!editor && cliente.enderecos.length === 0 && <p className="cm-text-muted">Nenhum endereço cadastrado.</p>}
      {cliente.enderecos.map((endereco, index) => (
        <article className="cm-card" style={{ marginBottom: 16, overflowWrap: "anywhere" }} key={endereco.id}>
          <h4 className="cm-section-title">Endereço {index + 1}</h4>
          <p>{endereco.logradouro}, {endereco.numero}</p>
          {endereco.complemento && <p>{endereco.complemento}</p>}
          <p>{endereco.bairro} · {endereco.cidade} / {endereco.estado}</p>
          <p className="cm-text-muted">CEP {formatCep(endereco.cep)}</p>
          <div className="cm-page-actions">
            <button className="cm-link-button" style={visual.link} disabled={busy || !!editor} onClick={() => editar(endereco)}>Editar endereço {index + 1}</button>
            <button className="cm-link-button" style={visual.link} disabled={busy || !!editor} onClick={() => { setRemover(endereco.id); setError(""); }}><IconTrash width={14} height={14} aria-hidden="true" /> Excluir endereço {index + 1}</button>
          </div>
          {remover === endereco.id && (
            <div role="group" aria-label="Confirmar exclusão do endereço">
              <p>Excluir este endereço de entrega?</p>
              <div className="cm-page-actions">
                <button className="cm-button-outline" style={visual.outline} disabled={busy} onClick={() => setRemover(null)}>Manter endereço</button>
                <button className="cm-button-pill" style={visual.button} disabled={busy} onClick={excluir}>{busy ? "Excluindo..." : "Confirmar exclusão do endereço"}</button>
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

function HistoricoCompras({ compras, cliente, handleAbrirParcelaModal }) {
  return (
    <section>
      <h3 className="cm-section-title">Histórico de compras</h3>
      {compras.length === 0 ? <p className="cm-text-muted">Este cliente ainda não tem compras registradas.</p> : compras.map((compra) => (
        <details className="cm-card" style={{ marginBottom: 16 }} key={compra.id}>
          <summary style={{ cursor: "pointer" }}>
            <strong>Compra #{compra.id} · {moeda(compra.valorTotal)}</strong>
            <p className="cm-text-muted" style={{ marginBottom: 0 }}>
              {data(compra.data)} · {compra.formaPagamento} · {({ CONCLUIDA: "Concluída", CANCELADA: "Cancelada", PENDENTE: "Pendente" })[compra.status] || compra.status}
            </p>
          </summary>
          <h4 className="cm-section-title" style={{ marginTop: 20 }}>Itens da compra</h4>
          {compra.itens.length === 0 ? <p className="cm-text-muted">Nenhum item registrado.</p> : (
            <table className="cm-table" aria-label={`Itens da compra ${compra.id}`}>
              <thead><tr><th scope="col">Produto / variação</th><th scope="col">Quantidade</th><th scope="col">Preço unitário</th></tr></thead>
              <tbody>{compra.itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.grade.variacao.produto.nome}<div className="cm-text-muted">{[item.grade.variacao.cor, item.grade.tamanho].filter(Boolean).join(" / ")}</div></td>
                  <td>{item.quantidade}</td><td>{moeda(item.precoUnitario)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <h4 className="cm-section-title" style={{ marginTop: 20 }}>Parcelas</h4>
          {compra.parcelas.length === 0 ? <p className="cm-text-muted">Esta compra não possui parcelas.</p> : (
            <table className="cm-table" aria-label={`Parcelas da compra ${compra.id}`}>
              <thead><tr><th scope="col">Parcela</th><th scope="col">Vencimento</th><th scope="col">Valor</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead>
              <tbody>{compra.parcelas.map((parcela) => (
                <tr key={parcela.id}>
                  <td>{parcela.numero}</td><td>{data(parcela.dataVencimento)}</td><td>{moeda(parcela.valor)}</td>
                  <td><span className={`cm-badge ${parcela.status === "PAGA" ? "cm-badge-green" : parcelaAtrasada(parcela) ? "cm-badge-red" : "cm-badge-yellow"}`}>
                    {parcela.status === "PAGA" ? "Paga" : parcelaAtrasada(parcela) ? "Atrasada" : "Pendente"}
                  </span></td>
                  {
                    ["PAGA", "CANCELADA"].includes(parcela.status) ? <td>---</td>:
                    (<td>
                      <button
                        className="cm-link-button"
                        onClick={() => handleAbrirParcelaModal(compra.parcelas, parcela.id, cliente)}
                      >
                        <strong>Registrar Pagamento</strong>
                      </button>
                    </td> )
                  }
                </tr>
              ))}</tbody>
            </table>
          )}
        </details>
      ))}
    </section>
  );
}

function CreditoCliente({ cliente }) {
  const [dias, setDias] = useState("30");
  const [debitos, setDebitos] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDebitos(null);
    setError("");
    api.get(`/clientes/${cliente.id}/debitos?dias=${dias}`, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setDebitos(value); })
      .catch((err) => { if (!controller.signal.aborted) setError(mensagemErro(err)); });
    return () => controller.abort();
  }, [cliente.id, dias, reload]);

  const credito = cliente.crediario;
  return (
    <section>
      <h3 className="cm-section-title">Crediário do cliente</h3>
      {credito ? (
        <div className="cm-card-grid" role="group" aria-label="Limites do crediário">
          <div className="cm-card"><p className="cm-text-muted">Limite de crédito</p><strong>{moeda(credito.limiteCredito)}</strong></div>
          <div className="cm-card"><p className="cm-text-muted">Limite disponível</p><strong>{moeda(credito.limiteDisponivel)}</strong></div>
          <div className="cm-card"><p className="cm-text-muted">Status do crediário</p><span className={`cm-badge ${credito.status === "ATIVO" ? "cm-badge-green" : "cm-badge-red"}`}>{credito.status === "ATIVO" ? "Ativo" : "Bloqueado"}</span></div>
        </div>
      ) : <p className="cm-text-muted">Este cadastro não possui crediário.</p>}
      <h3 className="cm-section-title">Resumo de débitos</h3>
      <label className="cm-label">Vencimentos até
        <select className="cm-input" value={dias} onChange={(event) => setDias(event.target.value)}
          style={{ display: "block", marginTop: 6 }} aria-label="Período dos débitos">
          <option value="30">Próximos 30 dias</option><option value="60">Próximos 60 dias</option><option value="90">Próximos 90 dias</option>
        </select>
      </label>
      <p className="cm-text-muted">Inclui parcelas já vencidas e pagas com vencimento até o período selecionado.</p>
      {error ? (
        <div className="cm-error" role="alert"><p>{error}</p><button className="cm-link-button" style={visual.link} onClick={() => setReload(reload + 1)}>Tentar novamente</button></div>
      ) : !debitos ? <p role="status">Carregando débitos...</p> : (
        <dl className="cm-card-grid" aria-label="Resumo de débitos" aria-live="polite">
          {[["Pendente", moeda(debitos.totalPendente)], ["Em atraso", moeda(debitos.totalAtraso)], ["Pago", moeda(debitos.totalPago)], ["Parcelas atrasadas", debitos.qtdParcelasAtrasadas]].map(([label, value]) => (
            <div className="cm-card" key={label}><dt className="cm-text-muted">{label}</dt><dd style={{ margin: "8px 0 0", fontWeight: 600 }}>{value}</dd></div>
          ))}
        </dl>
      )}
    </section>
  );
}
