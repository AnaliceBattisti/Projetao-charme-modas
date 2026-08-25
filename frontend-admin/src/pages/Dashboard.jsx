const indicadores = [
  { label: "Total em estoque", valor: "—" },
  { label: "Vendas do mês", valor: "—" },
  { label: "A receber no crediário", valor: "—" },
  { label: "Produtos com estoque baixo", valor: "—" },
];

export default function Dashboard() {
  return (
    <div>
      <div className="cm-page-header">
        <div>
          <h1 className="cm-page-title">Dashboard</h1>
          <p className="cm-page-subtitle">Visão geral da loja: estoque, vendas e crediário.</p>
        </div>
      </div>
      <div className="cm-card-grid">
        {indicadores.map((indicador) => (
          <div className="cm-card" key={indicador.label}>
            <p>{indicador.label}</p>
            <strong>{indicador.valor}</strong>
          </div>
        ))}
      </div>
      <div className="cm-card">
        <p>Últimas movimentações (placeholder — ligar em GET /estoque)</p>
      </div>
    </div>
  );
}
