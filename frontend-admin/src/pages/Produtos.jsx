// Endpoints: GET/POST /produtos, PUT/DELETE /produtos/:id, POST /produtos/:id/variacoes
export default function Produtos() {
  return (
    <div>
      <h1 className="cm-page-title">Produtos</h1>
      <div className="cm-card">
        <p>Lista de produtos (foto, nome, categoria, marca, fornecedor, preço, estoque total).</p>
        <p>Cada produto abre suas variações (cor, tamanho, SKU, estoque atual).</p>
      </div>
    </div>
  );
}
