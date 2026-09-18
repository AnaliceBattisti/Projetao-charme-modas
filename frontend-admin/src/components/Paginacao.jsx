import { IconChevronLeft, IconChevronRight } from "../icons.jsx";

export default function Paginacao({
  pagina,
  totalItens,
  itensPorPagina,
  onMudarPagina,
  label,
  disabled = false,
}) {
  if (totalItens === 0) return null;

  const totalPaginas = Math.ceil(totalItens / itensPorPagina);
  const primeiroItem = (pagina - 1) * itensPorPagina + 1;
  const ultimoItem = Math.min(pagina * itensPorPagina, totalItens);
  const inicio = Math.max(1, Math.min(pagina - 1, totalPaginas - 2));
  const fim = Math.min(totalPaginas, inicio + 2);
  const numerosVisiveis = new Set([1, totalPaginas]);

  for (let numero = inicio; numero <= fim; numero += 1) {
    numerosVisiveis.add(numero);
  }

  const paginas = [];
  const numerosOrdenados = [...numerosVisiveis].sort((a, b) => a - b);
  numerosOrdenados.forEach((numero, indice) => {
    const anterior = numerosOrdenados[indice - 1];
    if (numero - anterior === 2) paginas.push(anterior + 1);
    else if (numero - anterior > 2) paginas.push(`reticencias-${numero}`);
    paginas.push(numero);
  });

  return (
    <nav className="cm-pagination" aria-label={label}>
      <span className="cm-text-muted" role="status">
        Exibindo {primeiroItem}–{ultimoItem} de {totalItens} registros
      </span>
      <div className="cm-pagination-actions">
        <button
          className="cm-pagination-button"
          type="button"
          aria-label="Página anterior"
          title="Página anterior"
          disabled={disabled || pagina === 1}
          onClick={() => onMudarPagina(pagina - 1)}
        >
          <IconChevronLeft aria-hidden="true" />
        </button>
        {paginas.map((numero) => (
          typeof numero === "number" ? (
            <button
              key={numero}
              className="cm-pagination-button"
              type="button"
              aria-label={`Página ${numero}`}
              aria-current={numero === pagina ? "page" : undefined}
              disabled={disabled}
              onClick={() => onMudarPagina(numero)}
            >
              {numero}
            </button>
          ) : (
            <span key={numero} className="cm-pagination-ellipsis" aria-hidden="true">
              …
            </span>
          )
        ))}
        <button
          className="cm-pagination-button"
          type="button"
          aria-label="Próxima página"
          title="Próxima página"
          disabled={disabled || pagina === totalPaginas}
          onClick={() => onMudarPagina(pagina + 1)}
        >
          <IconChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
