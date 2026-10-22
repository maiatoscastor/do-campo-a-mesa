import Cabecalho from './components/Cabecalho.jsx';
import NavegacaoInferior from './components/NavegacaoInferior.jsx';

// Estrutura da página. O conteúdo ainda é provisório: o design vai aparecendo commit a commit.
export default function App() {
  return (
    <>
      <Cabecalho />
      <main id="conteudo" className="container py-4">
        <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
          Em construção
        </span>
        <h1 className="mt-2">Do Campo à Mesa</h1>
        <p>Mercado digital de produtores locais do Alto Minho.</p>
        <p className="text-body-secondary">
          O design vai aparecendo aqui, commit a commit.
        </p>
      </main>
      <NavegacaoInferior />
    </>
  );
}
