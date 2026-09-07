import { useEffect, useState } from "react";
import { api } from "./api.js";

// A vitrine inteira consome a mesma lista de produtos, então a promessa é
// compartilhada: um GET /produtos por carregamento de página.
let cache = null;

export function carregarProdutos() {
  if (!cache) {
    cache = api.get("/produtos").catch((erro) => {
      cache = null; // permite tentar de novo depois de uma falha
      throw erro;
    });
  }
  return cache;
}

export function useProdutos() {
  const [produtos, setProdutos] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregarProdutos()
      .then(setProdutos)
      .catch((e) => setErro(e.message));
  }, []);

  return { produtos: produtos ?? [], carregando: !produtos && !erro, erro };
}

/** Soma o estoque de todas as variações do produto. */
export function estoqueDe(produto) {
  return produto.variacoes.reduce((total, v) => total + v.estoqueAtual, 0);
}

/** Primeira variação com foto — usada como capa nos cards e na vitrine. */
export function capaDe(produto) {
  return produto.variacoes.find((v) => v.imagemUrl)?.imagemUrl ?? null;
}

/** Listas de filtro derivadas do que existe cadastrado, sem lista fixa no código. */
export function categoriasDe(produtos) {
  return [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort();
}

export function tamanhosDe(produtos) {
  const tamanhos = produtos.flatMap((p) => p.variacoes.map((v) => v.tamanho).filter(Boolean));
  return [...new Set(tamanhos)];
}

export function coresDe(produtos) {
  const cores = produtos.flatMap((p) => p.variacoes.map((v) => v.cor).filter(Boolean));
  return [...new Set(cores)].sort();
}
