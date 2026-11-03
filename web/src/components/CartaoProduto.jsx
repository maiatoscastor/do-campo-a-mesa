import ImagemProduto from './ImagemProduto.jsx';
import { formatarPreco } from '../produtos.js';

// Cartão de um produto no catálogo. Os dados inventados levam o selo "Exemplo".
export default function CartaoProduto({ produto }) {
  const { nome, preco, unidade, stock, biologico, exemplo, produtor } = produto;
  const esgotado = stock === 0;

  return (
    <article className="card cartao-produto h-100">
      <div className="cartao-produto-topo">
        <ImagemProduto produto={produto} />
        <div className="cartao-produto-selos">
          {exemplo && <span className="selo selo-exemplo">Exemplo</span>}
          {esgotado && <span className="selo selo-esgotado">Esgotado</span>}
        </div>
      </div>
      <div className="card-body">
        <h2 className="cartao-produto-nome">{nome}</h2>
        <p className="cartao-produto-produtor">
          {produtor.nomeExploracao}
          {produtor.localizacao?.nomeConcelho &&
            ` · ${produtor.localizacao.nomeConcelho}`}
        </p>
        <p className="cartao-produto-preco">
          <strong>{formatarPreco(preco)}</strong> / {unidade}
        </p>
        {biologico && <span className="selo selo-biologico">Biológico</span>}
      </div>
    </article>
  );
}
