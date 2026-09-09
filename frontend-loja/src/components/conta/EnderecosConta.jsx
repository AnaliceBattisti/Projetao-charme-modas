import { useRef, useState } from "react";
import Campo from "../ui/Campo.jsx";
import {
  criarEnderecoConta,
  atualizarEnderecoConta,
  removerEnderecoConta,
} from "../../services/conta.js";

const ufs =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
const campos = [
  [
    "cep",
    "CEP",
    {
      maxLength: 9,
      inputMode: "numeric",
      autoComplete: "postal-code",
      pattern: "[0-9]{5}-?[0-9]{3}",
      placeholder: "00000-000",
    },
  ],
  ["logradouro", "Rua / avenida", { autoComplete: "address-line1" }],
  ["numero", "Número", { maxLength: 20, placeholder: "Número ou s/n" }],
  [
    "complemento",
    "Complemento",
    {
      required: false,
      autoComplete: "address-line2",
      placeholder: "Apartamento, bloco...",
    },
  ],
  ["bairro", "Bairro", {}],
  ["cidade", "Cidade", { autoComplete: "address-level2" }],
];

export default function EnderecosConta({
  enderecos: iniciais,
  onSessaoExpirada,
}) {
  const [enderecos, setEnderecos] = useState(iniciais);
  const [editor, setEditor] = useState(null);
  const [removendo, setRemovendo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const retorno = useRef(null);
  const formulario = useRef(null);
  function abrir(endereco = {}) {
    setEditor(endereco);
    setRemovendo(null);
    setMensagem("");
    requestAnimationFrame(() =>
      formulario.current?.querySelector("input")?.focus(),
    );
  }
  function falha(error) {
    if (error.status === 401) return onSessaoExpirada();
    setErro(true);
    setMensagem(error.message);
  }
  async function salvar(event) {
    event.preventDefault();
    if (salvando) return;
    const dados = Object.fromEntries(new FormData(event.currentTarget));
    setSalvando(true);
    setMensagem("");
    try {
      const endereco = editor.id
        ? await atualizarEnderecoConta(editor.id, dados)
        : await criarEnderecoConta(dados);
      setEnderecos((atuais) =>
        editor.id
          ? atuais.map((item) => (item.id === endereco.id ? endereco : item))
          : [...atuais, endereco],
      );
      setEditor(null);
      setErro(false);
      setMensagem("Endereço salvo com sucesso.");
    } catch (error) {
      falha(error);
    } finally {
      setSalvando(false);
      requestAnimationFrame(() => retorno.current?.focus());
    }
  }
  async function remover(id) {
    if (salvando) return;
    setSalvando(true);
    setMensagem("");
    try {
      await removerEnderecoConta(id);
      setEnderecos((atuais) => atuais.filter((item) => item.id !== id));
      setRemovendo(null);
      setErro(false);
      setMensagem("Endereço removido.");
    } catch (error) {
      falha(error);
    } finally {
      setSalvando(false);
      requestAnimationFrame(() => retorno.current?.focus());
    }
  }
  return (
    <section className="conta-secao" aria-labelledby="conta-enderecos-titulo">
      <h2 id="conta-enderecos-titulo">Meus endereços</h2>
      {!enderecos.length && (
        <p className="conta-nota">Você ainda não tem endereços cadastrados.</p>
      )}
      <div className="conta-enderecos">
        {enderecos.map((endereco) => (
          <article className="conta-card conta-endereco" key={endereco.id}>
            <h3>
              {endereco.logradouro}, {endereco.numero}
            </h3>
            {endereco.complemento && <p>{endereco.complemento}</p>}
            <p>
              {endereco.bairro} · {endereco.cidade} / {endereco.estado}
            </p>
            <p>CEP {endereco.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}</p>
            <div className="conta-botoes">
              <button
                className="cm-botao cm-botao-claro conta-botao-pequeno"
                type="button"
                disabled={salvando || editor !== null}
                aria-label={`Editar endereço de ${endereco.logradouro}`}
                onClick={() => abrir(endereco)}
              >
                Editar
              </button>
              <button
                className="conta-link"
                type="button"
                disabled={salvando || editor !== null}
                aria-label={`Remover endereço de ${endereco.logradouro}`}
                onClick={() => {
                  setRemovendo(endereco.id);
                  setMensagem("");
                }}
              >
                Remover
              </button>
            </div>
            {removendo === endereco.id && (
              <div className="conta-confirmacao">
                <p>Remover este endereço da sua conta?</p>
                <div className="conta-botoes">
                  <button
                    className="cm-botao conta-botao-pequeno"
                    type="button"
                    disabled={salvando}
                    onClick={() => remover(endereco.id)}
                  >
                    {salvando ? "Removendo..." : "Confirmar remoção"}
                  </button>
                  <button
                    className="conta-link"
                    type="button"
                    disabled={salvando}
                    onClick={() => setRemovendo(null)}
                  >
                    Manter endereço
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {editor ? (
        <form
          ref={formulario}
          onSubmit={salvar}
          className="conta-endereco-form"
          key={editor.id || "novo"}
          aria-busy={salvando}
        >
          <h3>{editor.id ? "Editar endereço" : "Novo endereço"}</h3>
          <fieldset disabled={salvando}>
            <div className="conta-form-grid">
              {campos.map(([name, label, props]) => (
                <Campo
                  key={name}
                  name={name}
                  label={label}
                  required
                  maxLength={150}
                  defaultValue={editor[name] ?? ""}
                  {...props}
                />
              ))}
              <Campo
                label="Estado (UF)"
                name="estado"
                required
                defaultValue={editor.estado ?? ""}
                autoComplete="address-level1"
              >
                <option value="">Selecione</option>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Campo>
            </div>
            <div className="conta-botoes conta-acoes">
              <button className="cm-botao" type="submit">
                {salvando ? "Salvando..." : "Salvar endereço"}
              </button>
              <button
                className="cm-botao cm-botao-claro"
                type="button"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <button
          className="cm-botao cm-botao-claro conta-acoes"
          type="button"
          disabled={salvando}
          onClick={() => abrir()}
        >
          Adicionar endereço
        </button>
      )}
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
    </section>
  );
}
