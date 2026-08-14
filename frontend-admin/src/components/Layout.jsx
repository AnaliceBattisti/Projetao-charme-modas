import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/produtos", label: "Produtos" },
  { to: "/estoque", label: "Estoque" },
  { to: "/fornecedores", label: "Fornecedores" },
  { to: "/clientes", label: "Clientes" },
  { to: "/crediario", label: "Crediário" },
  { to: "/compras", label: "Compras" },
];

export default function Layout() {
  return (
    <div className="cm-layout">
      <aside className="cm-sidebar">
        <img
          className="cm-logo"
          src="/logo.png"
          alt="Charme Modas"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <p className="cm-brand">Charme Modas</p>
        <p className="cm-tagline">Seu estilo. Seu charme.</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => "cm-nav-link" + (isActive ? " active" : "")}
          >
            {link.label}
          </NavLink>
        ))}
      </aside>
      <main className="cm-content">
        <Outlet />
      </main>
    </div>
  );
}
