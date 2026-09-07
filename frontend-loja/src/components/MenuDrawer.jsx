import { NavLink } from "react-router-dom";
import { IconeFechar } from "../icons.jsx";

const itens = [
  { to: "/", label: "Início", end: true },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/catalogo?novidades=1", label: "Novidades" },
  { to: "/favoritos", label: "Favoritos" },
  { to: "/conta", label: "Minha conta" },
  { to: "/carrinho", label: "Sacola" },
];

export default function MenuDrawer({ aberto, onFechar, categorias = [] }) {
  if (!aberto) return null;

  return (
    <>
      <div className="cm-menu-fundo" onClick={onFechar} />
      <aside className="cm-menu">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="cm-marca">
            <img src="/logo.png" alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
            <p className="cm-marca-nome">Charme Modas</p>
          </span>
          <button className="cm-icone-botao" onClick={onFechar} aria-label="Fechar menu">
            <IconeFechar />
          </button>
        </div>

        <h2>Menu</h2>
        <p>Navegue pelas principais áreas da loja.</p>

        <nav>
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onFechar}
              className={({ isActive }) => "cm-menu-item" + (isActive ? " ativo" : "")}
            >
              {item.label}
            </NavLink>
          ))}
          {/* As categorias vêm dos produtos cadastrados, não de uma lista fixa. */}
          {categorias.map((categoria) => (
            <NavLink
              key={categoria}
              to={`/catalogo?categoria=${encodeURIComponent(categoria)}`}
              onClick={onFechar}
              className="cm-menu-item"
            >
              {categoria}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
