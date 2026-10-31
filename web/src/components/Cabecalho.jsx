import { Link, NavLink } from 'react-router';
import Icone from './Icone.jsx';
import { DESTINOS } from '../navegacao.js';

// Cabeçalho fixo no topo. No telemóvel só mostra a marca, porque a navegação está na barra
// inferior; a partir do computador (lg, 1024 px) mostra também a navegação e o carrinho.
export default function Cabecalho() {
  // O carrinho fica à direita, só com o ícone, como nas lojas online
  const ligacoes = DESTINOS.filter(
    (destino) => destino.caminho !== '/carrinho',
  );

  return (
    <header className="cabecalho sticky-top">
      <div className="container cabecalho-interior">
        <Link className="marca" to="/">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          Do Campo à Mesa
        </Link>

        <nav className="d-none d-lg-block" aria-label="Navegação principal">
          <ul className="nav nav-pills">
            {ligacoes.map(({ nome, caminho }) => (
              <li className="nav-item" key={caminho}>
                {/* O NavLink marca a página atual sozinho (classe active e aria-current).
                    O end faz com que o Início só fique marcado no endereço "/" exato. */}
                <NavLink
                  className="nav-link"
                  to={caminho}
                  end={caminho === '/'}
                >
                  {nome}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <NavLink
          className="botao-icone d-none d-lg-inline-grid ms-auto"
          to="/carrinho"
          aria-label="Carrinho"
        >
          {({ isActive }) => <Icone nome="carrinho" cheio={isActive} />}
        </NavLink>
      </div>
    </header>
  );
}
