import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import Icone from './Icone.jsx';

// Os separadores de uma área com várias secções (a conta, a administração). No telemóvel, ficam numa
// faixa que desliza na horizontal; no computador, numa coluna ao lado do conteúdo. Cada secção pode
// ter um número (por exemplo, os produtores por validar), com o texto para os leitores de ecrã em
// "sufixo". "raiz" é o endereço que só fica marcado quando é exatamente esse (como /conta).
export default function MenuSeccoes({ rotulo, seccoes, raiz }) {
  const { pathname } = useLocation();
  const menu = useRef(null);

  // No telemóvel, a faixa desliza até ao separador da página aberta, para ele estar sempre à vista
  useEffect(() => {
    menu.current
      ?.querySelector('a.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <nav className="conta-menu" aria-label={rotulo} ref={menu}>
      <ul>
        {seccoes.map(({ caminho, nome, icone, contador, sufixo }) => (
          <li key={caminho}>
            <NavLink to={caminho} end={caminho === raiz}>
              <Icone nome={icone} tamanho={20} />
              {nome}
              {contador > 0 && (
                <span className="contador">
                  {contador}
                  {sufixo && <span className="visually-hidden"> {sufixo}</span>}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
