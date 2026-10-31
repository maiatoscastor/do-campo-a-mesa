import { Outlet, ScrollRestoration } from 'react-router';
import Cabecalho from './components/Cabecalho.jsx';
import NavegacaoInferior from './components/NavegacaoInferior.jsx';
import Rodape from './components/Rodape.jsx';

// Estrutura comum a todas as páginas: a página aberta aparece no lugar do <Outlet />.
// A navegação vem antes do conteúdo (a barra inferior está fixa no fundo do ecrã, mas no teclado
// chega-se a ela logo a seguir ao cabeçalho).
export default function App() {
  return (
    <>
      <a className="saltar visually-hidden-focusable" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <Cabecalho />
      <NavegacaoInferior />
      <main id="conteudo" className="container py-4" tabIndex={-1}>
        <Outlet />
      </main>
      <Rodape />
      {/* Ao mudar de página volta ao topo; ao recuar, repõe a posição em que se estava */}
      <ScrollRestoration />
    </>
  );
}
