import Cabecalho from './components/Cabecalho.jsx';
import NavegacaoInferior from './components/NavegacaoInferior.jsx';
import Rodape from './components/Rodape.jsx';

// Estrutura da página. A navegação vem antes do conteúdo (a barra inferior está fixa no fundo do
// ecrã, mas no teclado chega-se a ela logo a seguir ao cabeçalho). O conteúdo ainda é provisório:
// o design vai aparecendo commit a commit.
export default function App() {
  return (
    <>
      <a className="saltar visually-hidden-focusable" href="#conteudo">
        Saltar para o conteúdo
      </a>
      <Cabecalho />
      <NavegacaoInferior />
      <main id="conteudo" className="container py-4" tabIndex={-1}>
        <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
          Em construção
        </span>
        <h1 className="mt-2">Do Campo à Mesa</h1>
        <p>Mercado digital de produtores locais do Alto Minho.</p>
        <p className="text-body-secondary">
          O design vai aparecendo aqui, commit a commit.
        </p>
      </main>
      <Rodape />
    </>
  );
}
