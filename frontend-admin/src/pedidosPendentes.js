import { useEffect, useState } from "react";
import { api } from "./api.js";

// Pedidos da loja virtual chegam sozinhos, sem ninguém avisar a equipe: o painel
// consulta de tempos em tempos para o aviso aparecer sem precisar recarregar.
const INTERVALO = 60_000;

export function usePedidosPendentes() {
  const [dados, setDados] = useState({ total: 0, pedidos: [] });
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    function buscar() {
      // Sem aba visível não adianta consultar; economiza requisição à toa.
      if (document.visibilityState === "hidden") return;
      api
        .get("/compras/pendentes")
        .then((resposta) => {
          if (ativo) {
            setDados(resposta);
            setErro(null);
          }
        })
        .catch((e) => ativo && setErro(e.message));
    }

    buscar();
    const timer = setInterval(buscar, INTERVALO);
    document.addEventListener("visibilitychange", buscar);
    return () => {
      ativo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", buscar);
    };
  }, []);

  return { ...dados, erro };
}
