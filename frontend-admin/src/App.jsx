import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Produtos from "./pages/Produtos.jsx";
import Estoque from "./pages/Estoque.jsx";
import Fornecedores from "./pages/Fornecedores.jsx";
import Clientes from "./pages/Clientes.jsx";
import Crediario from "./pages/Crediario.jsx";
import Compras from "./pages/Compras.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/crediario" element={<Crediario />} />
          <Route path="/compras" element={<Compras />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
