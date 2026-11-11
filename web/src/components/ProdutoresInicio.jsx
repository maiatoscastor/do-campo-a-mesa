import CartaoProdutor, { LinhaProdutor } from './CartaoProdutor.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';

const MAXIMO = 4;

// Primeiro os mais bem avaliados (e, com a mesma média, os que têm mais avaliações); depois os que
// têm mais produtos. A ordem vem toda dos dados, sem escolhas à mão.
function ordenar(a, b) {
  const media = (b.avaliacao?.media ?? 0) - (a.avaliacao?.media ?? 0);
  const avaliacoes = (b.avaliacao?.total ?? 0) - (a.avaliacao?.total ?? 0);
  return media || avaliacoes || b.produtos - a.produtos;
}

// Alguns produtores, com o logótipo, o concelho, quantos produtos têm e a nota das avaliações, e a
// ligação para a página com todos. Sozinhos, em cartões (quatro numa linha no computador); numa
// coluna, ao lado dos próximos leilões, numa lista como a dos leilões, para as duas colunas ficarem
// iguais.
export default function ProdutoresInicio({ produtores, naColuna = false }) {
  if (produtores.length === 0) {
    return null;
  }
  const lista = [...produtores].sort(ordenar).slice(0, MAXIMO);

  return (
    <SeccaoInicio
      titulo="Conheça os produtores"
      ligacao="/produtores"
      textoDaLigacao="Ver todos"
    >
      {naColuna ? (
        <ul className="list-group">
          {lista.map((produtor) => (
            <li className="list-group-item p-0" key={produtor.id}>
              <LinhaProdutor produtor={produtor} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
          {lista.map((produtor) => (
            <div className="col" key={produtor.id}>
              <CartaoProdutor produtor={produtor} />
            </div>
          ))}
        </div>
      )}
    </SeccaoInicio>
  );
}
