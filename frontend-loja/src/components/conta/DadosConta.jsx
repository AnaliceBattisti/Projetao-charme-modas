import { useRef, useState } from "react";
import Campo from "../ui/Campo.jsx";
import { atualizarConta } from "../../services/conta.js";
import { formatCpf, formatTelefoneInput } from "../../format.js";

const estadosCivis = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Separado(a)",
  "Viúvo(a)",
  "União estável",
];
const campos = [
  "nome",
  "cpf",
  "telefone",
  "idade",
  "profissao",
  "estadoCivil",
];
const dadosFormulario = (cliente) =>
  ({
    ...Object.fromEntries(
      campos.map((campo) => [campo, String(cliente[campo] ?? "")]),
    ),
    cpf: formatCpf(cliente.cpf ?? ""),
    telefone: formatTelefoneInput(cliente.telefone ?? ""),
  });

export default function DadosConta({ usuario, onAtualizar, onSessaoExpirada }) {
  const [form, setForm] = useState(() => dadosFormulario(usuario.cliente));
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const retorno = useRef(null);
  const original = dadosFormulario(usuario.cliente);
  const alterados = campos.filter((campo) => form[campo] !== original[campo]);
  const opcoesEstadoCivil =
    estadosCivis.includes(form.estadoCivil) || !form.estadoCivil
      ? estadosCivis
      : [...estadosCivis, form.estadoCivil];

  const input = (name) => ({
    name,
    value: form[name],
    onChange: (event) => {
      setForm({ ...form, [name]: event.target.value });
      setMensagem("");
    },
  });
  async function salvar(event) {
    event.preventDefault();
    if (salvando || !alterados.length) return;
    const dados = Object.fromEntries(
      alterados.map((campo) => [
        campo,
        campo === "idade"
          ? form.idade === ""
            ? null
            : Number(form.idade)
          : form[campo],
      ]),
    );
    setSalvando(true);
    setMensagem("");
    try {
      const { usuario: atualizado } = await atualizarConta(dados);
      onAtualizar(atualizado);
      setForm(dadosFormulario(atualizado.cliente));
      setErro(false);
      setMensagem("Seus dados foram atualizados com sucesso.");
    } catch (error) {
      if (error.status === 401) return onSessaoExpirada();
      setErro(true);
      setMensagem(error.message);
    } finally {
      setSalvando(false);
      requestAnimationFrame(() => retorno.current?.focus());
    }
  }
  return (
    <section className="conta-secao" aria-labelledby="conta-dados-titulo">
      <h2 id="conta-dados-titulo">Dados pessoais</h2>
      <p className="conta-nota">
        Mantenha seus dados de cadastro e contato atualizados.
      </p>
      <form onSubmit={salvar} aria-busy={salvando}>
        <fieldset disabled={salvando}>
          <div className="conta-form-grid">
            <Campo
              label="Nome completo"
              {...input("nome")}
              autoComplete="name"
              required
              maxLength={150}
            />
            <Campo
              label="CPF"
              {...input("cpf")}
              mascara={formatCpf}
              inputMode="numeric"
              required
              maxLength={14}
              pattern="([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})"
              title="Informe um CPF válido, com ou sem pontuação."
            />
            <Campo
              label="Telefone"
              {...input("telefone")}
              mascara={formatTelefoneInput}
              type="tel"
              autoComplete="tel"
              maxLength={30}
              placeholder="(87) 99999-9999"
            />
            <div>
              <Campo
                label="E-mail de contato"
                name="email"
                value={usuario.cliente.email ?? ""}
                type="email"
                disabled
                aria-describedby="conta-email-ajuda"
              />
              <p className="conta-ajuda" id="conta-email-ajuda">
                O e-mail não pode ser alterado nesta página. Para entrar na conta,
                continue usando{" "}
                <strong>{usuario.email}</strong>.
              </p>
            </div>
            <Campo
              label="Idade"
              {...input("idade")}
              type="number"
              min={0}
              max={130}
              step={1}
              placeholder="Anos"
            />
            <Campo label="Profissão" {...input("profissao")} maxLength={150} />
            <Campo label="Estado civil" {...input("estadoCivil")}>
              <option value="">Não informado</option>
              {opcoesEstadoCivil.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </Campo>
          </div>
          <div className="conta-botoes conta-acoes">
            <button
              className="cm-botao"
              type="submit"
              disabled={!alterados.length}
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              className="cm-botao cm-botao-claro"
              type="button"
              disabled={!alterados.length}
              onClick={() => {
                setForm(original);
                setMensagem("");
              }}
            >
              Desfazer alterações
            </button>
          </div>
        </fieldset>
        {mensagem && (
          <p
            ref={retorno}
            tabIndex={-1}
            className={erro ? "conta-erro" : "conta-nota"}
            role={erro ? "alert" : "status"}
          >
            {mensagem}
          </p>
        )}
      </form>
    </section>
  );
}
