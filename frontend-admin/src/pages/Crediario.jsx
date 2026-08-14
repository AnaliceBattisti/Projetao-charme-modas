// Endpoints: GET /crediario, GET /crediario/cliente/:clienteId, POST/PUT /crediario
export default function Crediario() {
  return (
    <div>
      <h1 className="cm-page-title">Crediário</h1>
      <div className="cm-card">
        <p>Clientes com crediário ativo: limite, valor em aberto, status.</p>
        <p>Detalhe por cliente: parcelas (número, valor, vencimento, status) e ação de marcar como paga.</p>
      </div>
    </div>
  );
}
