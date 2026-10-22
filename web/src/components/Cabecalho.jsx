import Icone from './Icone.jsx';
import { DESTINOS, estaAtivo } from '../navegacao.js';

// Cabeçalho fixo no topo. No telemóvel só mostra a marca, porque a navegação está na barra
// inferior; a partir do computador (lg, 1024 px) mostra também a navegação e o carrinho.
export default function Cabecalho() {
  // O carrinho fica à direita, só com o ícone, como nas lojas online
  const ligacoes = DESTINOS.filter(
    (destino) => destino.caminho !== '/carrinho',
  );
  const noCarrinho = estaAtivo('/carrinho');

  return (
    <header className="cabecalho sticky-top">
      <div className="container cabecalho-interior">
        <a className="marca" href="/">
          <img src="/favicon.svg" alt="" width="34" height="34" />
          Do Campo à Mesa
        </a>

        <nav className="d-none d-lg-block" aria-label="Navegação principal">
          <ul className="nav nav-pills">
            {ligacoes.map(({ nome, caminho }) => {
              const ativo = estaAtivo(caminho);
              return (
                <li className="nav-item" key={caminho}>
                  <a
                    className={ativo ? 'nav-link active' : 'nav-link'}
                    href={caminho}
                    aria-current={ativo ? 'page' : undefined}
                  >
                    {nome}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <a
          className="botao-icone d-none d-lg-inline-grid ms-auto"
          href="/carrinho"
          aria-label="Carrinho"
          aria-current={noCarrinho ? 'page' : undefined}
        >
          <Icone nome="carrinho" cheio={noCarrinho} />
        </a>
      </div>
    </header>
  );
}
