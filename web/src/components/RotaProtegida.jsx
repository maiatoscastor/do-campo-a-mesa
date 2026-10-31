import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { useSessao } from '../hooks/useSessao.js';

// Envolve as páginas que exigem sessão e, se forem indicados, um destes papéis. Serve para mostrar a
// página certa a cada pessoa: quem protege os dados a sério é a API, que valida cada pedido.
export default function RotaProtegida({ papeis }) {
  const { utilizador } = useSessao();
  const { pathname, search } = useLocation();

  if (!utilizador) {
    // Guarda a página pedida, para voltar a ela depois de entrar
    return (
      <Navigate to="/entrar" replace state={{ depois: pathname + search }} />
    );
  }

  if (papeis && !papeis.includes(utilizador.papel)) {
    return (
      <>
        <title>Sem permissão · Do Campo à Mesa</title>
        <h1>Sem permissão</h1>
        <p className="text-body-secondary">
          A sua conta não tem acesso a esta página.
        </p>
        <Link to="/">Voltar ao início</Link>
      </>
    );
  }

  return <Outlet />;
}
