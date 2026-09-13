// A cor da variação é texto livre digitado no painel ("Azul marinho", "rosa bebê"),
// então aqui traduzimos esse nome para um hex que dá pra pintar na bolinha do card.
// O que não estiver no mapa cai no fallback neutro e aparece só pelo nome.

const MAPA = {
  branco: "#ffffff",
  "off white": "#f6f2ea",
  creme: "#f3e9d8",
  bege: "#e6d5bd",
  nude: "#e3c1ac",
  areia: "#dcc9a8",
  amarelo: "#f5c518",
  mostarda: "#d9a520",
  dourado: "#c9a227",
  laranja: "#ef7c22",
  coral: "#ff6f61",
  salmao: "#fa8072",
  vermelho: "#d32f2f",
  bordo: "#5c1224",
  vinho: "#6b1229",
  marrom: "#7b4b2a",
  caramelo: "#a9682f",
  chocolate: "#4e342e",
  rosa: "#f4a6c0",
  "rosa bebe": "#f9cfe0",
  "rosa claro": "#f9cfe0",
  pink: "#ec4899",
  fucsia: "#d6249f",
  lilas: "#b39ddb",
  roxo: "#7e57c2",
  lavanda: "#cbb8e9",
  azul: "#1e6fd9",
  "azul marinho": "#1b2a4a",
  marinho: "#1b2a4a",
  "azul claro": "#7fb3e8",
  "azul bebe": "#a8cdf0",
  jeans: "#3b5a7a",
  turquesa: "#1abc9c",
  verde: "#2e8b57",
  "verde agua": "#a8e6cf",
  "verde militar": "#4b5320",
  "verde escuro": "#1f5132",
  oliva: "#6b6b23",
  cinza: "#9aa0a6",
  "cinza claro": "#cfd4d8",
  chumbo: "#4a4f55",
  grafite: "#3a3f44",
  prata: "#c0c0c0",
  preto: "#1a1a1a",
};

function normalizar(nome) {
  return (nome || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // "lilás" e "lilas" são a mesma cor
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Chaves compostas primeiro, senão "azul marinho" casaria só com "azul".
const CHAVES = Object.keys(MAPA).sort((a, b) => b.length - a.length);

// O mapa guarda a forma masculina ("branco"), mas quem cadastra escreve do jeito
// que fala — "Branca", "Vermelha", "Azul clara". Vira masculino antes de procurar.
function masculinizar(alvo) {
  return alvo
    .split(" ")
    .map((palavra) => (palavra.length > 3 && palavra.endsWith("a") ? palavra.slice(0, -1) + "o" : palavra))
    .join(" ");
}

/** Hex da cor pelo nome, ou null quando não reconhecemos o nome. */
export function corHex(nome) {
  const alvo = normalizar(nome);
  if (!alvo) return null;

  const candidatos = [alvo, masculinizar(alvo)];
  for (const candidato of candidatos) {
    if (MAPA[candidato]) return MAPA[candidato];
  }
  for (const candidato of candidatos) {
    const parecida = CHAVES.find((chave) => candidato.includes(chave));
    if (parecida) return MAPA[parecida];
  }
  return null;
}

/** Cores muito claras precisam de borda mais forte pra não sumir no fundo branco. */
export function corEhClara(hex) {
  if (!hex) return false;
  const n = parseInt(hex.slice(1), 16);
  const luz = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luz > 225;
}
