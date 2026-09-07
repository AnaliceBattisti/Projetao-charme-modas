import { createContext, useContext, useEffect, useMemo, useState } from "react";

// Carrinho e favoritos vivem no localStorage do navegador: a loja ainda não tem
// login de cliente, então não há onde guardar isso no servidor por enquanto.
const CHAVE_CARRINHO = "cm_carrinho";
const CHAVE_FAVORITOS = "cm_favoritos";

function ler(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Modo privado ou storage cheio: a loja segue funcionando na memória.
  }
}

const LojaContext = createContext(null);

export function LojaProvider({ children }) {
  const [itens, setItens] = useState(() => ler(CHAVE_CARRINHO, []));
  const [favoritos, setFavoritos] = useState(() => ler(CHAVE_FAVORITOS, []));

  useEffect(() => gravar(CHAVE_CARRINHO, itens), [itens]);
  useEffect(() => gravar(CHAVE_FAVORITOS, favoritos), [favoritos]);

  const valor = useMemo(() => {
    function adicionar(item, quantidade = 1) {
      setItens((atuais) => {
        const existente = atuais.find((i) => i.variacaoId === item.variacaoId);
        if (!existente) return [...atuais, { ...item, quantidade }];
        const somada = Math.min(existente.quantidade + quantidade, item.estoqueAtual);
        return atuais.map((i) => (i.variacaoId === item.variacaoId ? { ...i, quantidade: somada } : i));
      });
    }

    function alterarQuantidade(variacaoId, delta) {
      setItens((atuais) =>
        atuais.map((i) =>
          i.variacaoId === variacaoId
            ? { ...i, quantidade: Math.min(Math.max(i.quantidade + delta, 1), i.estoqueAtual) }
            : i
        )
      );
    }

    function remover(variacaoId) {
      setItens((atuais) => atuais.filter((i) => i.variacaoId !== variacaoId));
    }

    function alternarFavorito(produtoId) {
      setFavoritos((atuais) =>
        atuais.includes(produtoId) ? atuais.filter((id) => id !== produtoId) : [...atuais, produtoId]
      );
    }

    const subtotal = itens.reduce((total, i) => total + Number(i.precoUnitario) * i.quantidade, 0);
    const quantidadeTotal = itens.reduce((total, i) => total + i.quantidade, 0);

    return {
      itens,
      subtotal,
      quantidadeTotal,
      adicionar,
      alterarQuantidade,
      remover,
      limpar: () => setItens([]),
      favoritos,
      alternarFavorito,
      ehFavorito: (produtoId) => favoritos.includes(produtoId),
    };
  }, [itens, favoritos]);

  return <LojaContext.Provider value={valor}>{children}</LojaContext.Provider>;
}

export function useLoja() {
  const contexto = useContext(LojaContext);
  if (!contexto) throw new Error("useLoja precisa estar dentro de <LojaProvider>.");
  return contexto;
}
