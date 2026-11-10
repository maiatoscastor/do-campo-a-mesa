import CartaoProduto from './CartaoProduto.jsx';

// No máximo 6: duas linhas de 2 no telemóvel e de 3 no tablet; no computador, uma só linha de 5
// (lg) ou de 6 (xl), com cartões mais pequenos do que no catálogo, para o início mostrar mais
// coisas sem cada produto ocupar meio ecrã
const MAXIMO = 6;

function classeDaPosicao(posicao) {
  if (posicao === 5) {
    return 'd-none d-md-block d-lg-none d-xl-block';
  }
  if (posicao === 4) {
    return 'd-none d-md-block';
  }
  return '';
}

// Uma fila de produtos do início (os da época, comprar outra vez). Numa coluna (metade da largura,
// ao lado de outra secção), três numa linha, com o mesmo tamanho dos da fila inteira.
export default function FilaDeProdutos({ produtos, naColuna = false }) {
  return (
    <div
      className={`row row-cols-2 row-cols-md-3 g-3 ${naColuna ? '' : 'row-cols-lg-5 row-cols-xl-6'}`}
    >
      {produtos.slice(0, MAXIMO).map((produto, posicao) => (
        <div className={`col ${classeDaPosicao(posicao)}`} key={produto.id}>
          <CartaoProduto produto={produto} nivel="h3" />
        </div>
      ))}
    </div>
  );
}
