import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
} from 'react-router';
import Icone from './Icone.jsx';
import Ilustracao from './Ilustracao.jsx';
import PainelEntrada from './PainelEntrada.jsx';

const BANCA = ['kiwi', 'mel', 'vinho', 'abobora', 'queijo', 'maca'];

// Estrutura das páginas para entrar e criar conta: sem a navegação da aplicação, para a atenção
// ficar no formulário, mas com uma saída sempre à vista para voltar ao início.
// O viewTransition anima a mudança entre as duas páginas, sem recarregar nada.
export default function LayoutEntrada() {
  // O state guarda a página a que se volta depois de entrar, por isso passa de uma página à outra
  const { state } = useLocation();

  return (
    <div className="entrada">
      <div className="entrada-coluna">
        <header className="entrada-topo">
          <Link className="marca" to="/" aria-label="Do Campo à Mesa, início">
            <img src="/favicon.svg" alt="" width="34" height="34" />
            <span className="entrada-marca-nome">Do Campo à Mesa</span>
          </Link>
          <Link className="entrada-sair" to="/" viewTransition>
            <Icone nome="voltar" tamanho={18} />
            Voltar ao início
          </Link>
        </header>

        <div className="entrada-banca">
          {BANCA.map((ilustracao) => (
            <Ilustracao key={ilustracao} nome={ilustracao} />
          ))}
        </div>

        <main id="conteudo" className="entrada-conteudo" tabIndex={-1}>
          <nav className="alternador" aria-label="Entrar ou criar conta">
            <NavLink to="/entrar" state={state} viewTransition>
              Entrar
            </NavLink>
            <NavLink to="/registar" state={state} viewTransition>
              Criar conta
            </NavLink>
          </nav>
          <Outlet />
        </main>
      </div>

      <PainelEntrada />
      <ScrollRestoration />
    </div>
  );
}
