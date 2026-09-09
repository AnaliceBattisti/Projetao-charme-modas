import { useId } from "react";

export default function Campo({ label, children, ...props }) {
  const id = useId();
  return (
    <div className="conta-campo">
      <label htmlFor={id}>{label}</label>
      {children ? (
        <select id={id} {...props}>
          {children}
        </select>
      ) : (
        <input id={id} {...props} />
      )}
    </div>
  );
}
