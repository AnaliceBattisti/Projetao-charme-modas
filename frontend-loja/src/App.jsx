import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { LojaProvider } from "./estado.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Produto from "./pages/Produto.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import Checkout from "./pages/Checkout.jsx";
import MeusPedidos from "./pages/MeusPedidos.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import EmBreve from "./pages/EmBreve.jsx";
import Login from "./pages/Login.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import EditarConta from "./pages/EditarConta.jsx";
import EsqueciSenha from "./pages/EsqueciSenha.jsx";
import RedefinirSenha from "./pages/RedefinirSenha.jsx";
import Contato from "./pages/Contato.jsx";
import Informacoes from "./pages/Informacoes.jsx";
import "./styles/conta.css";

export default function App() {
  return (
    <LojaProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/produto/:id" element={<Produto />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/meus-pedidos" element={<MeusPedidos />} />
            <Route path="/meus-pedidos/:pedidoId" element={<MeusPedidos />} />
            <Route path="/conta" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/minha-conta" element={<Login />} />
            <Route path="/minha-conta/editar" element={<EditarConta />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/informacoes/:assunto" element={<Informacoes />} />
            <Route
              path="*"
              element={
                <EmBreve
                  titulo="Página não encontrada"
                  subtitulo="O endereço acessado não existe na loja."
                  descricao="Confira o catálogo para encontrar a peça que você procura."
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </LojaProvider>
  );
}
