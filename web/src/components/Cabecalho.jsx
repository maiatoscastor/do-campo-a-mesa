import { Link, NavLink } from 'react-router';
import Icone from './Icone.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { DESTINOS } from '../navegacao.js';

// As iniciais do primeiro e do último nome ("Ana Maria Costa" dá "AC")
function iniciais(nome) {
  const palavras = nome.trim().split(/\s+/);
  const letras = [palavras[0], palavras.at(-1)].slice(0, palavras.length);
  return letras.map(([letra]) => letra.toUpperCase()).join('');
}

// Cabeçalho fixo no topo. No telemóvel mostra a marca e a conta, porque a navegação está na barra
// inferior; a partir do computador (lg, 1024 px) mostra também a navegação e o carrinho.
export default function Cabecalho() {
  const { utilizador } = useSessao();

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

        <div className="d-flex align-items-center gap-2 ms-auto">
          <NavLink
            className="botao-icone d-none d-lg-inline-grid"
            to="/carrinho"
            aria-label="Carrinho"
          >
            {({ isActive }) => <Icone nome="carrinho" cheio={isActive} />}
          </NavLink>

          {utilizador ? (
            <NavLink
              className="botao-icone"
              to="/conta"
              aria-label="A minha conta"
            >
              <span className="avatar" aria-hidden="true">
                {iniciais(utilizador.nome)}
              </span>
            </NavLink>
          ) : (
            <Link className="btn btn-suave btn-sm botao-entrar" to="/entrar">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
