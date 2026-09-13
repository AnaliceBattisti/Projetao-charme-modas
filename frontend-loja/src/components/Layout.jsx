import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import MenuDrawer from "./MenuDrawer.jsx";

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <>
      <Header onAbrirMenu={() => setMenuAberto(true)} />
      <MenuDrawer aberto={menuAberto} onFechar={() => setMenuAberto(false)} />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
