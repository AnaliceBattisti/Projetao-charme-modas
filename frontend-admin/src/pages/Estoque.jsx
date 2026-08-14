// Endpoints: GET /estoque, GET /estoque/variacao/:variacaoId, POST /estoque
export default function Estoque() {
  return (
    <div>
      <h1 className="cm-page-title">Estoque</h1>
      <div className="cm-card">
        <p>Tabela de variações com estoque atual e alerta abaixo do mínimo.</p>
        <p>Histórico de movimentações (entrada/saída) por variação.</p>
      </div>
    </div>
  );
}
