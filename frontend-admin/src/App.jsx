import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Produtos from "./pages/Produtos.jsx";
import Estoque from "./pages/Estoque.jsx";
import Fornecedores from "./pages/Fornecedores.jsx";
import Clientes from "./pages/Clientes.jsx";
import Crediario from "./pages/Crediario.jsx";
import Compras from "./pages/Compras.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";
import ContasReceber from "./pages/ContasReceber.jsx";
import NovaCompra from "./pages/NovaCompra.jsx";
import RecuperarSenha from "./pages/RecuperarSenha.jsx";
import RedefinirSenha from "./pages/RedefinirSenha.jsx";
import Funcionarios from "./pages/Funcionarios.jsx";

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/crediario" element={<Crediario />} />
          <Route path="/contas-receber" element={<ContasReceber />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/compras/nova-compra" element={<NovaCompra />} />
          <Route
            path="/funcionarios"
            element={
              <RequireAuth somenteAdmin>
                <Funcionarios />
              </RequireAuth>
            }
          />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
