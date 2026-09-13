import { corEhClara, corHex } from "../cores.js";

const LIMITE_PADRAO = 5;

/**
 * Mostra as cores de um produto como bolinhas. Cor sem nenhuma peça em estoque
 * aparece apagada e riscada, pra não prometer o que a loja não tem.
 */
export default function BolinhasCor({ variacoes, limite = LIMITE_PADRAO, selecionada = null }) {
  const cores = (variacoes ?? []).filter((v) => v.cor);
  if (cores.length === 0) return null;

  const visiveis = cores.slice(0, limite);
  const restantes = cores.length - visiveis.length;

  return (
    <div className="cm-bolinhas" aria-label={`Cores: ${cores.map((v) => v.cor).join(", ")}`}>
      {visiveis.map((v) => {
        const hex = corHex(v.cor);
        const disponivel = (v.grades ?? []).some((g) => g.estoqueAtual > 0);
        const classes = [
          "cm-bolinha",
          hex ? "" : "cm-bolinha-desconhecida",
          hex && corEhClara(hex) ? "cm-bolinha-clara" : "",
          disponivel ? "" : "cm-bolinha-esgotada",
          selecionada && selecionada === v.cor ? "cm-bolinha-ativa" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span
            key={v.id ?? v.cor}
            className={classes}
            style={hex ? { background: hex } : undefined}
            title={disponivel ? v.cor : `${v.cor} — esgotado`}
          />
        );
      })}
      {restantes > 0 && <span className="cm-bolinhas-resto">+{restantes}</span>}
    </div>
  );
}
