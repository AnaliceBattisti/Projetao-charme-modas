import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import DadosConta from "../components/conta/DadosConta.jsx";
import EnderecosConta from "../components/conta/EnderecosConta.jsx";
import { consultarConta } from "../services/conta.js";

export default function EditarConta() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [semSessao, setSemSessao] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    consultarConta()
      .then(({ usuario }) => {
        if (ativo) setUsuario(usuario);
      })
      .catch((error) => {
        if (!ativo) return;
        if (error.status === 401) setSemSessao(true);
        else setErro(error.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);
  if (semSessao)
    return (
      <Navigate
        to="/login"
        replace
        state={{ voltarPara: "/minha-conta/editar" }}
      />
    );
  return (
    <div className="conta-card conta-informacoes conta-editar-conta">
      <nav className="conta-migalhas" aria-label="Navegação da conta">
        <Link to="/minha-conta">Minha conta</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Editar dados</span>
      </nav>
      <TituloPagina
        titulo="Editar meus dados"
        descricao="Cuide das suas informações e dos seus endereços em um só lugar."
      />
      {carregando ? (
        <p role="status">Carregando seus dados...</p>
      ) : erro ? (
        <div>
          <p className="conta-erro" role="alert">
            {erro}
          </p>
          <button
            className="cm-botao"
            type="button"
            onClick={() => setTentativa(tentativa + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        usuario && (
          <>
            <DadosConta
              usuario={usuario}
              onAtualizar={setUsuario}
              onSessaoExpirada={() => setSemSessao(true)}
            />
            <EnderecosConta
              enderecos={usuario.cliente.enderecos}
              onSessaoExpirada={() => setSemSessao(true)}
            />
          </>
        )
      )}
      <Link className="conta-link conta-voltar" to="/minha-conta">
        Voltar para minha conta
      </Link>
    </div>
  );
}
