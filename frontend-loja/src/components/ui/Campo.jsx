import { useId } from "react";

export default function Campo({ label, children, mascara, onChange, ...props }) {
  const id = useId();

  function atualizar(event) {
    if (mascara) {
      const input = event.currentTarget;
      const cursor = input.selectionStart ?? input.value.length;
      const noFinal = cursor === input.value.length;
      const digitosAntes = input.value.slice(0, cursor).replace(/\D/g, "").length;
      const valor = mascara(input.value);
      const indices = [...valor.matchAll(/\d/g)];
      const posicao = noFinal
        ? valor.length
        : digitosAntes ? (indices[digitosAntes - 1]?.index ?? valor.length - 1) + 1 : 0;
      input.value = valor;
      input.setSelectionRange(posicao, posicao);
    }
    onChange?.(event);
  }

  return (
    <div className="conta-campo">
      <label htmlFor={id}>{label}</label>
      {children ? (
        <select id={id} {...props} onChange={onChange}>
          {children}
        </select>
      ) : (
        <input id={id} {...props} onChange={atualizar} />
      )}
    </div>
  );
}
