import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { IconChevronLeft } from "../icons";

export default function NovaCompra() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("CREDIARIO");
  const [numParcelas, setNumParcelas] = useState(1);
  const [itens, setItens] = useState([]);

  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [variacoesDisponiveis, setVariacoesDisponiveis] = useState([]);
  const [variacaoId, setVariacaoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const intlCurr = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  useEffect(() => {
    api.get("/clientes").then((data) => setClientes(Array.isArray(data) ? data : data.dados || []));
    api.get("/produtos").then((data) => {
      const listaProdutos = Array.isArray(data) ? data : [];

      const produtosComEstoque = listaProdutos.filter((prod) =>
        prod.variacoes && prod.variacoes.some((v) => v.estoqueAtual > 0)
      );

      setProdutos(produtosComEstoque);
    });
  }, []);

  useEffect(()=>{
    setErro(null);
    const cliente = clientes.find(cliente => cliente.id == clienteId);
    
    if(cliente && cliente.crediario && formaPagamento==="CREDIARIO"){
      if(cliente.crediario.status !== "ATIVO"){
        setErro("Cliente com Crediário bloqueado.");
        return;
      }

      const valorTotal = itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);
      if(valorTotal > cliente.crediario.limiteDisponivel){
        setErro("Cliente com limite insuficiente no Crediário");
      }
    }
  }, [clienteId,itens,formaPagamento])

  const handleProdutoChange = (id) => {
    setProdutoSelecionadoId(id);
    setVariacaoId("");
    if (!id) {
      setVariacoesDisponiveis([]);
      setPrecoUnitario("");
      return;
    }

    const prod = produtos.find((p) => String(p.id) === String(id));
    if (prod) {
      const variacoesComEstoque = (prod.variacoes || []).filter(
        (v) => v.estoqueAtual > 0
      );
      setVariacoesDisponiveis(variacoesComEstoque);
      setQuantidade(1)
      setPrecoUnitario(prod.precoVenda || "");
      if (variacoesComEstoque.length > 0) {
        setVariacaoId(variacoesComEstoque[0].id);
      }
    }
  };

  const handleAdicionarItem = (e) => {
    e.preventDefault();
    if (!produtoSelecionadoId || !variacaoId || quantidade <= 0 || !precoUnitario) {
      alert("Preencha todos os campos do produto corretamente.");
      return;
    }

    const produtoObj = produtos.find((p) => String(p.id) === String(produtoSelecionadoId));
    const variacaoObj = variacoesDisponiveis.find((v) => String(v.id) === String(variacaoId));

    const itemExistente = itens.find((i) => String(i.variacaoId) === String(variacaoId));
    if (itemExistente) {
      alert("Item já adicionado a esta compra.");
      return;
    } else {
      setItens([
        ...itens,
        {
          variacaoId: Number(variacaoId),
          nomeProduto: produtoObj?.nome,
          cor: variacaoObj?.cor,
          tamanho: variacaoObj?.tamanho,
          quantidade: Number(quantidade),
          precoUnitario: Number(precoUnitario),
          subtotal: Number(quantidade) * Number(precoUnitario),
        },
      ]);
    }

    handleLimparSelecaoItem();
  };

  const handleLimparSelecaoItem = () =>{
    setProdutoSelecionadoId("");
    setVariacoesDisponiveis([]);
    setVariacaoId("");
    setQuantidade("");
    setPrecoUnitario("");
  }


  const handleRemoverItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const valorTotal = itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0);

  const handleSalvarCompra = async (e) => {
    e.preventDefault();
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione pelo menos um produto à compra.");
      return;
    }

    setLoading(true);
    setErro(null);

    const payload = {
      clienteId: Number(clienteId),
      formaPagamento,
      numParcelas: formaPagamento === "CREDIARIO" ? Number(numParcelas) : 1,
      origem: "backoffice",
      itens: itens.map((i) => ({
        variacaoId: i.variacaoId,
        quantidade: i.quantidade,
        precoUnitario: i.precoUnitario,
      })),
    };

    try {
      await api.post("/compras", payload);
      navigate("/compras");
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao registrar a compra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Nova Compra</h1>
          <p className="cm-page-subtitle">Cadastre uma nova venda e gere as parcelas automaticamente</p>
        </div>
        <div className="cm-page-actions">
          <button className="cm-button-outline" onClick={() => navigate("/compras")}>
            <IconChevronLeft />
            Voltar para compras
          </button>
        </div>
      </div>

      {erro && <div className="cm-error">{erro}</div>}

      <form onSubmit={handleSalvarCompra}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            <div className="cm-card">
              <h2 className="cm-section-title">Cliente</h2>
              <label className="cm-label">Selecione o Cliente</label>
              <select
                className="cm-input"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cpf ? `(${c.cpf})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="cm-card">
              <h2 className="cm-section-title">Itens da Compra</h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto auto",
                  gap: "10px",
                  alignItems: "end",
                  marginBottom: "20px",
                  background: "var(--cm-surface-alt)",
                  padding: "12px",
                  borderRadius: "8px",
                }}
              >
                <div style={{gridColumn: "span 2" }}>
                  <label className="cm-label">Produto</label>
                  <select
                    className="cm-input"
                    style={{ marginBottom: 0}}
                    value={produtoSelecionadoId}
                    onChange={(e) => handleProdutoChange(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{gridColumn: "span 2" }}>
                  <label className="cm-label">Variação</label>
                  <select
                    className="cm-input"
                    style={{ marginBottom: 0 }}
                    value={variacaoId}
                    onChange={(e) => setVariacaoId(e.target.value)}
                    disabled={variacoesDisponiveis.length === 0}
                  >
                    {variacoesDisponiveis.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.cor} / {v.tamanho}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="cm-label">Qtd.</label>
                  <input
                    type="number"
                    min="1"
                    className="cm-input"
                    style={{ marginBottom: 0 }}
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                  />
                </div>

                <div>
                  <label className="cm-label">Preço Unit.</label>
                  <input
                    type="number"
                    step="0.01"
                    className="cm-input"
                    style={{ marginBottom: 0 }}
                    value={precoUnitario}
                    onChange={(e) => setPrecoUnitario(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  className="cm-link-button"
                  onClick={handleLimparSelecaoItem}
                  style={{ height: "40px" }}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="cm-button-pill"
                  onClick={handleAdicionarItem}
                  style={{ height: "40px" }}
                >
                  Adicionar
                </button>
              </div>

              {itens.length === 0 ? (
                <p className="cm-text-muted">Nenhum produto adicionado à compra ainda.</p>
              ) : (
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Variação</th>
                      <th>Qtd.</th>
                      <th>Unitário</th>
                      <th>Subtotal</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.nomeProduto}</strong></td>
                        <td>{item.cor || "—"} / {item.tamanho || "—"}</td>
                        <td>{item.quantidade}</td>
                        <td>{intlCurr.format(item.precoUnitario)}</td>
                        <td>
                          <strong>{intlCurr.format(item.quantidade * item.precoUnitario)}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="cm-link-button cm-text-error"
                            onClick={() => handleRemoverItem(idx)}
                          >
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

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="cm-card" style={{ position: "sticky", top: "20px" }}>
              <h2 className="cm-section-title">Pagamento</h2>

              <label className="cm-label">Forma de Pagamento</label>
              <select
                className="cm-input"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="CREDIARIO">Crediário Interno</option>
                <option value="PIX">PIX (À Vista)</option>
                <option value="DINHEIRO">Dinheiro (À Vista)</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
              </select>

              {formaPagamento === "CREDIARIO" && (
                <div>
                  <label className="cm-label">Quantidade de Parcelas</label>
                  <select
                    className="cm-input"
                    value={numParcelas}
                    onChange={(e) => setNumParcelas(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}x {valorTotal > 0 ? `de ${intlCurr.format(valorTotal / n)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--cm-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "10px",
                  }}
                >
                  <strong style={{ fontSize: "1.1rem", color: "var(--cm-plum)" }}>Total</strong>
                  <strong style={{ fontSize: "1.4rem", color: "var(--cm-vinho)" }}>
                    {intlCurr.format(valorTotal)}
                  </strong>
                </div>
              </div>

              <button
                type="submit"
                className="cm-button-pill"
                disabled={loading || itens.length === 0 || clienteId === ""}
                style={{ width: "100%", marginTop: "24px", justifyContent: "center" }}
              >
                {loading ? "Registrando..." : "Finalizar Compra"}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}