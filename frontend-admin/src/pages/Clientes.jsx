// Endpoints: GET/POST /clientes, GET/PUT/DELETE /clientes/:id
export default function Clientes() {
  return (
    <div>
      <h1 className="cm-page-title">Clientes</h1>
      <div className="cm-card">
        <p>Lista de clientes (nome, CPF, telefone, status do crediário).</p>
        <p>Detalhe do cliente traz crediário e histórico de compras.</p>
      </div>
    </div>
  );
}
