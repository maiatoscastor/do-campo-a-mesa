import { Link, NavLink } from 'react-router';
import Icone from './Icone.jsx';
import MarcaFechada from './MarcaFechada.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { useSessao } from '../hooks/useSessao.js';
import { destinosPara, textoDoCarrinho } from '../navegacao.js';
import { iniciais } from '../utilizador.js';

// Cabeçalho fixo no topo. No telemóvel mostra a marca e a conta, porque a navegação está na barra
// inferior; a partir do computador (lg, 1024 px) mostra também a navegação e o carrinho.
export default function Cabecalho() {
  const { utilizador } = useSessao();
  const produtosNoCarrinho = useCarrinho().linhas.length;

  // O carrinho fica à direita, só com o ícone, como nas lojas online
  const destinos = destinosPara(utilizador);
  const ligacoes = destinos.filter(({ caminho }) => caminho !== '/carrinho');
  const temCarrinho = destinos.length > ligacoes.length;

  return (
    <header className="cabecalho sticky-top">
      <div className="container cabecalho-interior">
        <Link className="marca" to="/">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          Do Campo à Mesa
        </Link>

        <nav className="d-none d-lg-block" aria-label="Navegação principal">
          <ul className="nav nav-pills">
            {ligacoes.map(({ nome, caminho, fechado }) => (
              <li className="nav-item" key={caminho}>
                {/* O NavLink marca a página atual sozinho (classe active e aria-current).
                    O end faz com que o Início só fique marcado no endereço "/" exato. */}
                <NavLink
                  className="nav-link"
                  to={caminho}
                  end={caminho === '/'}
                >
                  {nome}
                  {fechado && !utilizador && (
                    <MarcaFechada className="cabecalho-fechado" />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="d-flex align-items-center gap-2 ms-auto">
          {temCarrinho && (
            <NavLink
              className="botao-icone d-none d-lg-inline-grid"
              to="/carrinho"
              aria-label={`Carrinho${textoDoCarrinho(produtosNoCarrinho)}`}
            >
              {({ isActive }) => (
                <>
                  <Icone nome="carrinho" cheio={isActive} />
                  {produtosNoCarrinho > 0 && (
                    <span className="contador contador-icone">
                      {produtosNoCarrinho}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )}

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
            <Link
              className="btn btn-suave btn-sm botao-entrar"
              to="/entrar"
              viewTransition
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
