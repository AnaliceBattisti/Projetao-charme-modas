import { Link, useParams } from "react-router-dom";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import EmBreve from "./EmBreve.jsx";

const assuntos = {
  trocas: [
    "Trocas e devoluções",
    "As condições de troca e devolução serão disponibilizadas antes do início das vendas online. Para informações sobre a loja física, consulte nossos canais de atendimento.",
  ],
  privacidade: [
    "Privacidade",
    "O cadastro envia seu nome, e-mail, CPF, telefone e senha ao servidor da Charme Modas. Os dados pessoais e endereços ficam no cadastro de cliente, e a senha é armazenada como hash. O acesso usa um cookie de sessão. Sua sacola e seus favoritos ficam neste navegador. O checkout ainda não finaliza compras. As informações completas de privacidade serão disponibilizadas pela loja.",
  ],
  termos: [
    "Termos de uso",
    "A loja permite consultar os produtos cadastrados, criar uma conta, entrar e editar seus dados e endereços. O checkout e o pagamento online ainda não estão disponíveis. As condições comerciais completas serão publicadas antes do início das vendas online.",
  ],
};
export default function Informacoes() {
  const { assunto } = useParams();
  const conteudo = Object.hasOwn(assuntos, assunto) ? assuntos[assunto] : null;
  if (!conteudo)
    return (
      <EmBreve
        titulo="Página não encontrada"
        descricao="Confira o catálogo para continuar navegando."
      />
    );
  return (
    <section className="conta-informacoes conta-card">
      <TituloPagina titulo={conteudo[0]} />
      <p>{conteudo[1]}</p>
      <Link className="cm-botao cm-botao-claro" to="/contato">
        Contato e loja
      </Link>
    </section>
  );
}
