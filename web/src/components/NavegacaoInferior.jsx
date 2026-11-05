import { NavLink } from 'react-router';
import Icone from './Icone.jsx';
import MarcaFechada from './MarcaFechada.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { useSessao } from '../hooks/useSessao.js';
import { destinosPara, textoDoCarrinho } from '../navegacao.js';

// Barra de navegação fixa no fundo do ecrã, ao alcance do polegar. Só aparece no telemóvel e no
// tablet: a partir do computador (lg, 1024 px), a navegação passa para o cabeçalho.
export default function NavegacaoInferior() {
  const { utilizador } = useSessao();
  const produtosNoCarrinho = useCarrinho().linhas.length;

  return (
    <nav
      className="navegacao-inferior fixed-bottom d-lg-none"
      aria-label="Navegação principal"
    >
      <ul className="navegacao-inferior-lista">
        {destinosPara(utilizador).map(({ nome, caminho, icone, fechado }) => (
          <li key={caminho}>
            <NavLink
              className="navegacao-inferior-item"
              to={caminho}
              end={caminho === '/'}
            >
              {({ isActive }) => (
                <>
                  <span className="navegacao-inferior-icone">
                    <Icone nome={icone} cheio={isActive} />
                    {fechado && !utilizador && (
                      <MarcaFechada className="navegacao-inferior-fechado" />
                    )}
                    {caminho === '/carrinho' && produtosNoCarrinho > 0 && (
                      <span
                        className="contador contador-icone"
                        aria-hidden="true"
                      >
                        {produtosNoCarrinho}
                      </span>
                    )}
                  </span>
                  {nome}
                  {caminho === '/carrinho' && (
                    <span className="visually-hidden">
                      {textoDoCarrinho(produtosNoCarrinho)}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
