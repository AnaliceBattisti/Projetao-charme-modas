// Endpoints: GET /compras, GET /compras/:id, POST /compras
export default function Compras() {
  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Compras</h1>
          <p className="cm-page-subtitle">Registro de vendas, itens e forma de pagamento.</p>
        </div>
      </div>
      <div className="cm-card">
        <p>Nova compra: cliente, itens (produto → variação → quantidade → preço), forma de pagamento.</p>
        <p>Se crediário: prévia das parcelas antes de confirmar.</p>
      </div>
    </div>
  );
}
