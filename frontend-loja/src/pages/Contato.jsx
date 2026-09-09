import { Link } from "react-router-dom";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import { loja } from "../data/loja.js";

export default function Contato() {
  return (
    <div className="conta-pagina-interna">
      <TituloPagina
        titulo="Contato e informações da loja"
        descricao="Encontre aqui os canais de atendimento e dados para visitar a Charme Modas."
      />
      <section className="conta-card conta-contato">
        <div className="conta-form-grid">
          <article>
            <h2>Endereço</h2>
            <strong>{loja.endereco || `Nossa loja em ${loja.cidade}`}</strong>
            {!loja.endereco && (
              <p>O endereço completo estará disponível em breve.</p>
            )}
          </article>
          <article>
            <h2>WhatsApp e telefone</h2>
            <strong>{loja.telefone || "Contato em breve"}</strong>
            <p>
              {loja.telefone
                ? "Fale com a nossa equipe."
                : "Estamos preparando nossos canais de atendimento."}
            </p>
          </article>
          <article>
            <h2>Instagram</h2>
            {loja.instagram ? (
              <a
                href={`https://www.instagram.com/${encodeURIComponent(loja.instagram)}/`}
                target="_blank"
                rel="noreferrer"
              >
                @{loja.instagram}
              </a>
            ) : (
              <>
                <strong>Em breve</strong>
                <p>Acompanhe as novidades da Charme Modas.</p>
              </>
            )}
          </article>
          <article>
            <h2>Horário de atendimento</h2>
            <strong>{loja.horario || "Horários em breve"}</strong>
            <p>Será um prazer receber você na nossa loja.</p>
          </article>
        </div>
        <div className="conta-botoes">
          {loja.whatsapp ? (
            <a
              className="cm-botao"
              href={`https://wa.me/${loja.whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              Falar no WhatsApp
            </a>
          ) : (
            <button type="button" className="cm-botao" disabled>
              WhatsApp em breve
            </button>
          )}
          <Link to="/" className="cm-botao cm-botao-claro">
            Voltar para a loja
          </Link>
        </div>
      </section>
    </div>
  );
}
