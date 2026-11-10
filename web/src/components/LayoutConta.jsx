import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import Icone from './Icone.jsx';
import MenuSeccoes from './MenuSeccoes.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { iniciais, PAPEIS } from '../utilizador.js';

// As secções da conta e quem as vê (sem papéis, todos)
const SECCOES = [
  { caminho: '/conta', nome: 'Dados pessoais', icone: 'pessoa' },
  {
    caminho: '/conta/quinta',
    nome: 'A minha página',
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
];

// Estrutura de "A minha conta": quem tem a sessão e os separadores de cada papel. O administrador
// só tem aqui os dados pessoais: o trabalho dele fica na área da administração (LayoutAdmin.jsx).
export default function LayoutConta() {
  const { utilizador, atualizar, sair } = useSessao();
  const navegar = useNavigate();
  const seccoes = SECCOES.filter(
    ({ papeis }) => !papeis || papeis.includes(utilizador.papel),
  );

  // Os dados podem ter mudado (por exemplo, o produtor ter sido aprovado). Se o pedido falhar, os que
  // já estão no ecrã continuam válidos.
  useEffect(() => {
    atualizar().catch(() => {});
  }, [atualizar]);

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
            <MenuSeccoes
              rotulo="Secções da conta"
              seccoes={seccoes}
              raiz="/conta"
            />
          )}
        </div>
      </div>
      <div className="col-lg-9">
        <Outlet />
      </div>
    </div>
  );
}
