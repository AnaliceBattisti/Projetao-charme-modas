import { Navigate } from "react-router-dom";
import { useSessao } from "../auth.jsx";

export default function RequireAuth({ children, somenteAdmin = false }) {
  const { autenticado, carregando, ehAdmin } = useSessao();

  // Enquanto o backend não responde quem está logado, não dá pra decidir: mandar
  // para o login aqui jogaria a pessoa para fora a cada F5.
  if (carregando) {
    return <p className="cm-content">Carregando...</p>;
  }
  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  if (somenteAdmin && !ehAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}
