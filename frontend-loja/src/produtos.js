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

/** Soma o estoque de todas as grades de todas as cores do produto. */
export function estoqueDe(produto) {
  return produto.variacoes.reduce(
    (total, v) => total + v.grades.reduce((soma, g) => soma + g.estoqueAtual, 0),
    0
  );
}

/** Grades de uma cor que ainda têm peça disponível. */
export function gradesDisponiveis(variacao) {
  return (variacao.grades ?? []).filter((g) => g.estoqueAtual > 0);
}

/** Primeira cor com foto — usada como capa nos cards e na vitrine. */
export function capaDe(produto) {
  return produto.variacoes.find((v) => v.imagemUrl)?.imagemUrl ?? null;
}

export const DIAS_PARA_SER_NOVIDADE = 30;

/** Produto cadastrado recentemente — usado no selo NOVO e na aba Novidades. */
export function ehNovidade(produto) {
  if (!produto.criadoEm) return false;
  const limite = new Date();
  limite.setDate(limite.getDate() - DIAS_PARA_SER_NOVIDADE);
  return new Date(produto.criadoEm) >= limite;
}

/** Listas de filtro derivadas do que existe cadastrado, sem lista fixa no código. */
export function categoriasDe(produtos) {
  return [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort();
}

// Ordem de vitrine, não alfabética: P vem antes de M, que vem antes de G.
const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "XGG", "U", "UNICO", "ÚNICO"];

function posicao(tamanho) {
  const normal = tamanho.trim().toUpperCase();
  const conhecido = ORDEM_TAMANHOS.indexOf(normal);
  if (conhecido >= 0) return [0, conhecido, normal];
  // Numéricos (36, 38, 40...) vêm depois das letras, em ordem numérica.
  if (/^\d+$/.test(normal)) return [1, Number(normal), normal];
  return [2, 0, normal];
}

export function ordenarTamanhos(tamanhos) {
  return [...tamanhos].sort((a, b) => {
    const [grupoA, valorA, textoA] = posicao(a);
    const [grupoB, valorB, textoB] = posicao(b);
    if (grupoA !== grupoB) return grupoA - grupoB;
    if (valorA !== valorB) return valorA - valorB;
    return textoA.localeCompare(textoB);
  });
}

export function tamanhosDe(produtos) {
  const tamanhos = produtos.flatMap((p) =>
    p.variacoes.flatMap((v) => (v.grades ?? []).map((g) => g.tamanho))
  );
  return ordenarTamanhos([...new Set(tamanhos.filter(Boolean))]);
}

export function coresDe(produtos) {
  const cores = produtos.flatMap((p) => p.variacoes.map((v) => v.cor).filter(Boolean));
  return [...new Set(cores)].sort();
}
