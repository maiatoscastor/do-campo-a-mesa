import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useOutletContext,
} from 'react-router';
import EstadoVazio from './EstadoVazio.jsx';
import { useSessao } from '../hooks/useSessao.js';

// Envolve as páginas que exigem sessão e, se forem indicados, um destes papéis. Serve para mostrar a
// página certa a cada pessoa: quem protege os dados a sério é a API, que valida cada pedido.
//
// Com a prop "fechada", um visitante fica na página e vê uma mensagem com as ligações para entrar,
// em vez de ser atirado para o formulário sem explicação. Sem ela, segue diretamente para a entrada.
export default function RotaProtegida({ papeis, fechada }) {
  const { utilizador } = useSessao();
  const { pathname, search } = useLocation();
  // O que a estrutura de cima partilha com as páginas (por exemplo, a conta) passa por aqui também
  const contexto = useOutletContext();
  // Guarda a página pedida, para voltar a ela depois de entrar
  const depois = { depois: pathname + search };

  if (!utilizador) {
    if (!fechada) {
      return <Navigate to="/entrar" replace state={depois} />;
    }
    return (
      <>
        <title>{`${fechada.pagina} · Do Campo à Mesa`}</title>
        <h1 className="mb-3">{fechada.pagina}</h1>
        <EstadoVazio
          icone="cadeado"
          titulo={fechada.titulo}
          texto={fechada.texto}
        >
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link
              className="btn btn-primary"
              to="/entrar"
              state={depois}
              viewTransition
            >
              Entrar
            </Link>
            <Link
              className="btn btn-suave"
              to="/registar"
              state={depois}
              viewTransition
            >
              Criar conta
            </Link>
          </div>
        </EstadoVazio>
      </>
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

  return <Outlet context={contexto} />;
}
