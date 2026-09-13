import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../auth.js";
import { usePedidosPendentes } from "../pedidosPendentes.js";
import {
  IconDashboard,
  IconTag,
  IconBox,
  IconTruck,
  IconUsers,
  IconCard,
  IconCart,
  IconGear,
  IconLogout,
  IconDollarSign
} from "../icons.jsx";

const links = [
  { to: "/", label: "Dashboard", end: true, Icon: IconDashboard },
  { to: "/produtos", label: "Produtos", Icon: IconTag },
  { to: "/estoque", label: "Estoque", Icon: IconBox },
  { to: "/fornecedores", label: "Fornecedores", Icon: IconTruck },
  { to: "/clientes", label: "Clientes", Icon: IconUsers },
  { to: "/crediario", label: "Crediário", Icon: IconCard },
  { to: "/contas-receber", label: "Contas a receber", Icon: IconDollarSign },
  { to: "/compras", label: "Compras / Vendas", Icon: IconCart, contador: "pedidos" },
  { to: "/configuracoes", label: "Configurações", Icon: IconGear },
];

export default function Layout() {
  const navigate = useNavigate();
  const { total: pedidosPendentes } = usePedidosPendentes();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="cm-layout">
      <aside className="cm-sidebar">
        <div className="cm-sidebar-brand">
          <img
            className="cm-logo-square"
            src="/logo.png"
            alt="Charme Modas"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div>
            <p className="cm-brand">Charme Modas</p>
            <p className="cm-sidebar-subtitle">Painel administrativo</p>
          </div>
        </div>

        <nav className="cm-sidebar-nav">
          {links.map(({ to, label, end, Icon, contador }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => "cm-nav-link" + (isActive ? " active" : "")}
            >
              <Icon />
              {label}
              {/* Aviso de pedido novo esperando analise da equipe. */}
              {contador === "pedidos" && pedidosPendentes > 0 && (
                <span className="cm-nav-badge" title={`${pedidosPendentes} pedido(s) aguardando analise`}>
                  {pedidosPendentes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button className="cm-nav-link cm-logout-button" onClick={handleLogout}>
          <IconLogout />
          Sair
        </button>
      </aside>
      <main className="cm-content">
        <Outlet />
      </main>
    </div>
  );
}
