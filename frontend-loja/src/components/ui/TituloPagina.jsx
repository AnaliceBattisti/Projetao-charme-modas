import { useEffect } from "react";

export default function TituloPagina({ titulo, descricao, children }) {
  useEffect(() => {
    document.title = `${titulo} — Charme Modas`;
  }, [titulo]);
  return (
    <div className="conta-titulo">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {children}
    </div>
  );
}
