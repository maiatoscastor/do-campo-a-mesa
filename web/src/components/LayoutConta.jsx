import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import Icone from './Icone.jsx';
import { useProdutoresPendentes } from '../hooks/useProdutoresPendentes.js';
import { useSessao } from '../hooks/useSessao.js';
import { iniciais, PAPEIS } from '../utilizador.js';

// As secções da conta e quem as vê (sem papéis, todos)
const SECCOES = [
  { caminho: '/conta', nome: 'Dados pessoais', icone: 'pessoa' },
  {
    caminho: '/conta/quinta',
    nome: 'Quinta ou negócio',
    icone: 'quinta',
    papeis: ['produtor'],
  },
  {
    caminho: '/conta/produtos',
    nome: 'Os meus produtos',
    icone: 'caixa',
    papeis: ['produtor'],
  },
  {
    caminho: '/conta/leiloes',
    nome: 'Os meus leilões',
    icone: 'leiloes',
    papeis: ['produtor'],
  },
  {
    caminho: '/conta/encomendas',
    nome: 'Encomendas recebidas',
    icone: 'encomendas',
    papeis: ['produtor'],
  },
  {
    caminho: '/conta/produtores',
    nome: 'Validar produtores',
    icone: 'validar',
    papeis: ['admin'],
  },
];

// Estrutura de "A minha conta": quem tem a sessão e os separadores de cada papel. No telemóvel, os
// separadores ficam numa faixa que desliza na horizontal; no computador, numa coluna ao lado.
export default function LayoutConta() {
  const { utilizador, atualizar, sair } = useSessao();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const menu = useRef(null);
  const [pendentes, recontarPendentes] = useProdutoresPendentes();
  // Número a mostrar ao lado de cada separador (por agora, só os produtores por validar)
  const contadores = { '/conta/produtores': pendentes };
  const seccoes = SECCOES.filter(
    ({ papeis }) => !papeis || papeis.includes(utilizador.papel),
  );

  // Os dados podem ter mudado (por exemplo, o produtor ter sido aprovado). Se o pedido falhar, os que
  // já estão no ecrã continuam válidos.
  useEffect(() => {
    atualizar().catch(() => {});
  }, [atualizar]);

  // No telemóvel, a faixa de separadores desliza até ao da página aberta, para ele estar sempre à vista
  useEffect(() => {
    menu.current
      ?.querySelector('a.active')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  // Volta ao início. O flushSync muda de página antes de a sessão acabar: sem ele, via-se por um
  // instante a mensagem de que esta página exige conta.
  function terminarSessao() {
    navegar('/', { flushSync: true });
    sair();
  }

  return (
    <div className="row g-4">
      <div className="col-lg-3">
        <div className="conta-lateral">
          <div className="conta-perfil">
            <div className="conta-perfil-identidade">
              <span className="avatar avatar-grande" aria-hidden="true">
                {iniciais(utilizador.nome)}
              </span>
              <div className="conta-perfil-texto">
                <p className="fw-bold mb-0 text-truncate">{utilizador.nome}</p>
                <p className="small text-body-secondary mb-0">
                  {PAPEIS[utilizador.papel]}
                </p>
              </div>
            </div>
            <button
              className="btn btn-suave-perigo w-100 d-inline-flex align-items-center justify-content-center gap-2"
              type="button"
              onClick={terminarSessao}
            >
              <Icone nome="sair" tamanho={20} />
              Terminar sessão
            </button>
          </div>

          {/* Com uma só secção, os separadores não servem para nada */}
          {seccoes.length > 1 && (
            <nav
              className="conta-menu"
              aria-label="Secções da conta"
              ref={menu}
            >
              <ul>
                {seccoes.map(({ caminho, nome, icone }) => (
                  <li key={caminho}>
                    <NavLink to={caminho} end={caminho === '/conta'}>
                      <Icone nome={icone} tamanho={20} />
                      {nome}
                      {contadores[caminho] > 0 && (
                        <span className="contador">
                          {contadores[caminho]}
                          <span className="visually-hidden"> por validar</span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
      <div className="col-lg-9">
        {/* As secções podem pedir para recontar (por exemplo, depois de validar um produtor) */}
        <Outlet context={{ recontarPendentes }} />
      </div>
    </div>
  );
}
