import { Link } from 'react-router';
import Icone from './Icone.jsx';

// Para quem ainda não tem conta: o que se faz na aplicação, em três passos, e as duas formas de
// começar (comprar ou vender). Descreve a aplicação tal como ela é, sem números nem testemunhos.
const PASSOS = [
  {
    icone: 'produtos',
    titulo: 'Escolha',
    texto:
      'Produtos da época de pequenos produtores do Alto Minho, com o preço e o stock de cada um.',
  },
  {
    icone: 'encomendas',
    titulo: 'Encomende',
    texto:
      'Um carrinho para vários produtores. Levante na quinta ou receba em casa, e acompanhe cada encomenda.',
  },
  {
    icone: 'leiloes',
    titulo: 'Licite',
    texto:
      'Os lotes da época vão a leilão em direto, com o tempo e as licitações de todos em tempo real.',
  },
];

export default function ComoFunciona() {
  return (
    <section className="como-funciona" aria-labelledby="como-funciona">
      <h2 className="h5" id="como-funciona">
        Como funciona
      </h2>
      <ol className="como-funciona-passos">
        {PASSOS.map(({ icone, titulo, texto }) => (
          <li key={titulo}>
            <span className="cartao-atalho-icone">
              <Icone nome={icone} />
            </span>
            <div>
              <p className="fw-bold mb-1">{titulo}</p>
              <p className="small text-body-secondary mb-0">{texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/registar" viewTransition>
          Criar conta
        </Link>
        <Link
          className="btn btn-suave"
          to="/registar?papel=produtor"
          viewTransition
        >
          Quero vender os meus produtos
        </Link>
      </div>
    </section>
  );
}
