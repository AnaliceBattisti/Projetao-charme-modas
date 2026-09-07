import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import MenuDrawer from "./MenuDrawer.jsx";
import { categoriasDe, useProdutos } from "../produtos.js";

export default function Layout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { produtos } = useProdutos();

  return (
    <>
      <Header onAbrirMenu={() => setMenuAberto(true)} />
      <MenuDrawer
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        categorias={categoriasDe(produtos)}
      />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
