import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import { LojaProvider } from "./estado.jsx";
import Home from "./pages/Home.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Produto from "./pages/Produto.jsx";
import Carrinho from "./pages/Carrinho.jsx";
import Favoritos from "./pages/Favoritos.jsx";
import EmBreve from "./pages/EmBreve.jsx";

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
            <Route
              path="/checkout"
              element={
                <EmBreve
                  titulo="Finalizar compra"
                  subtitulo="1 Identificação · 2 Entrega · 3 Pagamento"
                  descricao="O checkout é a próxima etapa: dados de entrega, forma de pagamento (Pix, cartão, boleto ou crediário) e fechamento do pedido."
                />
              }
            />
            <Route
              path="/conta"
              element={
                <EmBreve
                  titulo="Sua conta Charme Modas"
                  subtitulo="Acompanhe pedidos, salve favoritos e agilize suas compras."
                  descricao="Login e cadastro de cliente ainda não estão prontos — hoje seus favoritos e carrinho ficam salvos apenas neste navegador."
                />
              }
            />
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
