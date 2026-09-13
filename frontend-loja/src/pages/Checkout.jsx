import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLoja } from "../estado.jsx";
import { request } from "../api.js";
import { consultarConta } from "../services/conta.js";
import { formatarPreco, formatTelefoneInput } from "../format.js";
import "../styles/checkout.css";

export default function Checkout() {
  const { itens, subtotal, limpar } = useLoja();
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState("CREDIARIO");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [pedido, setPedido] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const envio = useRef(null);
  const ocupado = useRef(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro("");
    consultarConta().then((data) => {
      if (ativo) setUsuario(data.usuario);
    }).catch((error) => {
      if (ativo && error.status !== 401) setErro(error.message);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [tentativa]);

  async function enviar(event) {
    event.preventDefault();
    if (ocupado.current || !usuario || !itens.length) return;
    ocupado.current = true;
    setEnviando(true);
    setErro("");
    try {
      const dados = {
        formaPagamento,
        itens: itens.map(({ variacaoId, quantidade }) => ({ variacaoId, quantidade })),
      };
      const assinatura = JSON.stringify({ clienteId: usuario.clienteId, ...dados });
      // Mantém a mesma chave ao tentar novamente após falha de conexão ou recarga.
      try {
        envio.current = JSON.parse(sessionStorage.getItem("cm_envio_pedido")) || envio.current;
      } catch { /* A confirmação continua funcionando sem armazenamento local. */ }
      if (envio.current?.assinatura !== assinatura) {
        envio.current = { assinatura, chavePedido: crypto.randomUUID() };
      }
      try { sessionStorage.setItem("cm_envio_pedido", JSON.stringify(envio.current)); } catch { /* Usa a chave em memória. */ }
      const { pedido: criado } = await request("/auth/me/pedidos", {
        method: "POST", body: { ...dados, chavePedido: envio.current.chavePedido },
      });
      setPedido(criado);
      limpar();
      envio.current = null;
      try { sessionStorage.removeItem("cm_envio_pedido"); } catch { /* O pedido já foi salvo. */ }
    } catch (error) {
      if (error.status === 401) setUsuario(null);
      setErro(error.message);
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }

  if (pedido) {
    const aguardando = pedido.status === "SOLICITADA";
    const cancelado = pedido.status === "CANCELADA";
    return (
      <div className="cm-pagina cm-checkout">
        <section className="cm-resumo cm-pedido-confirmado" role="status">
          <span className="cm-pedido-selo">{cancelado ? "Pedido cancelado" : aguardando ? "Pedido enviado" : "Pedido confirmado"}</span>
          <h1>Pedido #{pedido.id}</h1>
          <p>{cancelado ? "Este pedido foi cancelado pela loja. Entre em contato com a equipe para mais informações."
            : aguardando ? "Recebemos seu pedido! Ele aguarda a confirmação da loja. A equipe vai conferir a disponibilidade das peças e combinar a entrega ou retirada."
            : "A loja já confirmou este pedido. Entre em contato com a equipe para acompanhar a entrega ou retirada."}</p>
          <div className="cm-resumo-total"><span>Total dos produtos</span><strong>{formatarPreco(pedido.valorTotal)}</strong></div>
          {aguardando && <p>{pedido.formaPagamento === "CREDIARIO"
            ? "Você escolheu crediário. A loja vai analisar seu limite e combinar as parcelas antes de aprovar. Nenhuma parcela foi gerada neste envio."
            : "Você escolheu à vista. Entre em contato com a loja e informe o número do pedido para combinar o pagamento. Nenhum pagamento foi realizado pelo site."}</p>}
          <div className="conta-botoes">
            <Link className="cm-botao cm-botao-claro" to={`/meus-pedidos/${pedido.id}`}>Acompanhar pedido</Link>
            {pedido.formaPagamento === "A_VISTA" && <Link className="cm-botao" to="/contato">Ver contato da loja</Link>}
            <Link className="cm-botao cm-botao-claro" to="/catalogo">Voltar ao catálogo</Link>
          </div>
        </section>
      </div>
    );
  }

  if (!itens.length) return (
    <div className="cm-pagina"><h1 className="cm-titulo-pagina">Enviar pedido</h1>
      <div className="cm-vazio"><p>Adicione peças ao carrinho para enviar seu pedido.</p><Link className="cm-botao" to="/catalogo">Explorar catálogo</Link></div>
    </div>
  );

  return (
    <div className="cm-pagina cm-checkout">
      <Link className="conta-link" to="/carrinho">← Voltar ao carrinho</Link>
      <h1 className="cm-titulo-pagina">Enviar pedido</h1>
      <p className="cm-subtitulo-pagina">Confira suas peças e escolha como deseja combinar o pagamento com a loja.</p>
      <div className="cm-carrinho">
        <section className="cm-resumo">
          <h2>Como deseja fazer seu pedido?</h2>
          {carregando ? <p role="status">Carregando seus dados...</p> : !usuario ? (
            <div className="cm-checkout-identificacao">
              <p>Entre na sua conta para identificar seu pedido. Suas peças continuam no carrinho.</p>
              <Link className="cm-botao" to="/login" state={{ voltarPara: "/checkout" }}>Entrar para enviar pedido</Link>
              {erro && <><p className="conta-erro" role="alert">{erro}</p><button type="button" className="conta-link" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></>}
            </div>
          ) : (
            <form onSubmit={enviar} aria-busy={enviando}>
              <fieldset disabled={enviando}>
                <div className="cm-checkout-identificacao">
                  <strong>{usuario.cliente.nome}</strong>
                  <span>{usuario.cliente.telefone ? formatTelefoneInput(usuario.cliente.telefone) : usuario.email}</span>
                  <Link className="conta-link" to="/minha-conta/editar">Conferir meus dados</Link>
                </div>
                <label className={`cm-checkout-opcao${formaPagamento === "CREDIARIO" ? " selecionada" : ""}`}>
                  <input type="radio" name="formaPagamento" value="CREDIARIO" checked={formaPagamento === "CREDIARIO"} onChange={(e) => setFormaPagamento(e.target.value)} />
                  <span><strong>Crediário da loja</strong><small>Envie para análise. Limite e parcelas serão confirmados pela loja antes da aprovação.</small></span>
                </label>
                <label className={`cm-checkout-opcao${formaPagamento === "A_VISTA" ? " selecionada" : ""}`}>
                  <input type="radio" name="formaPagamento" value="A_VISTA" checked={formaPagamento === "A_VISTA"} onChange={(e) => setFormaPagamento(e.target.value)} />
                  <span><strong>À vista — combinar com a loja</strong><small>Envie o pedido e entre em contato com a equipe para combinar o pagamento.</small></span>
                </label>
                <p className="conta-nota">A entrega ou retirada será combinada com a loja. O envio aguarda confirmação de disponibilidade e não realiza pagamento online.</p>
                {erro && <p className="conta-erro" role="alert">{erro}</p>}
                <button type="submit" className="cm-botao cm-botao-bloco">{enviando ? "Enviando pedido..." : "Enviar pedido para a loja"}</button>
              </fieldset>
            </form>
          )}
        </section>
        <aside className="cm-resumo">
          <h2>Resumo do pedido</h2>
          <ul className="cm-checkout-itens">
            {itens.map((item) => <li key={item.variacaoId}>
              <div><strong>{item.nome}</strong><small>{item.tamanho || "Tamanho único"} · {item.cor || "Cor única"} · Qtd. {item.quantidade}</small></div>
              <span>{formatarPreco(item.quantidade * Number(item.precoUnitario))}</span>
            </li>)}
          </ul>
          <div className="cm-resumo-total"><span>Total estimado dos produtos</span><strong>{formatarPreco(subtotal)}</strong></div>
          <p className="conta-nota">O valor considera os preços atuais do catálogo no momento do envio. Entrega e condições serão combinadas com a loja.</p>
        </aside>
      </div>
    </div>
  );
}
