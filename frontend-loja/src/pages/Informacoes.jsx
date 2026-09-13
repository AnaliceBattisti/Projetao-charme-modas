import { Link, useParams } from "react-router-dom";
import TituloPagina from "../components/ui/TituloPagina.jsx";
import EmBreve from "./EmBreve.jsx";

const assuntos = {
  trocas: [
    "Trocas e devoluções",
    "As trocas são feitas na loja física, em Garanhuns/PE: leve a peça junto com o número do pedido e a equipe combina a troca com você. As condições completas de troca e devolução serão publicadas pela loja.",
  ],
  privacidade: [
    "Privacidade",
    "O cadastro envia seu nome, e-mail, CPF, telefone e senha ao servidor da Charme Modas. Os dados pessoais e endereços ficam no cadastro de cliente, e a senha é armazenada como hash. O acesso usa um cookie de sessão. Sua sacola e seus favoritos ficam salvos apenas neste navegador. O site não recebe nenhum dado de pagamento: não há cartão, Pix ou boleto processado aqui, o pagamento é combinado direto com a loja. As informações completas de privacidade serão disponibilizadas pela loja.",
  ],
  termos: [
    "Termos de uso",
    "Nesta loja você consulta os produtos, cria uma conta e envia pedidos para a Charme Modas. O pedido enviado é uma solicitação: a loja confere a disponibilidade das peças e, no crediário, o seu limite e as parcelas, antes de aprovar. Não existe pagamento online — o pagamento e a entrega ou retirada são combinados diretamente com a equipe. Os preços podem mudar até a aprovação do pedido. As condições comerciais completas serão publicadas pela loja.",
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
