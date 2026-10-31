import { NavLink } from 'react-router';
import Icone from './Icone.jsx';
import { DESTINOS } from '../navegacao.js';

// Barra de navegação fixa no fundo do ecrã, ao alcance do polegar. Só aparece no telemóvel e no
// tablet: a partir do computador (lg, 1024 px), a navegação passa para o cabeçalho.
export default function NavegacaoInferior() {
  return (
    <nav
      className="navegacao-inferior fixed-bottom d-lg-none"
      aria-label="Navegação principal"
    >
      <ul className="navegacao-inferior-lista">
        {DESTINOS.map(({ nome, caminho, icone }) => (
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
                  </span>
                  {nome}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
