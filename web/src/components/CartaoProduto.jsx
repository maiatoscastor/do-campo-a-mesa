import { Link } from 'react-router';
import Icone from './Icone.jsx';
import ImagemProduto from './ImagemProduto.jsx';
import Quantidade from './Quantidade.jsx';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarPreco } from '../produtos.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';

// Cartão de um produto no catálogo. Os dados inventados levam o selo "Exemplo". Em baixo, o botão
// para pôr no carrinho, que passa a escolha da quantidade quando o produto já lá está. O nome é um
// h2 no catálogo; dentro de uma secção com título (no início, na página do produtor), um h3.
export default function CartaoProduto({ produto, nivel = 'h2' }) {
  const Titulo = nivel;
  const {
    nome,
    preco,
    unidade,
    stock,
    biologico,
    exemplo,
    produtor,
    avaliacao,
  } = produto;
  const { utilizador } = useSessao();
  const { quantidadeDe, definir } = useCarrinho();
  const esgotado = stock === 0;
  const noCarrinho = quantidadeDe(produto.id);
  // O administrador não compra, e um produtor não compra os seus próprios produtos
  const podeComprar =
    utilizador?.papel !== 'admin' && produtor.id !== utilizador?.id;

  return (
    <article className="card cartao-produto h-100">
      <div className="cartao-produto-topo">
        <ImagemProduto produto={produto} />
        <div className="cartao-produto-selos">
          {exemplo && <span className="selo selo-exemplo">Exemplo</span>}
          {esgotado && <span className="selo selo-esgotado">Esgotado</span>}
        </div>
      </div>
      <div className="card-body d-flex flex-column">
        <Titulo className="cartao-produto-nome">{nome}</Titulo>
        <p className="cartao-produto-produtor">
          <Link to={`/produtores/${produtor.id}`}>
            {produtor.nomeExploracao}
          </Link>
          {produtor.localizacao?.nomeConcelho &&
            ` · ${produtor.localizacao.nomeConcelho}`}
        </p>
        <p className="cartao-produto-preco">
          <strong>{formatarPreco(preco)}</strong> / {unidade}
        </p>
        {avaliacao && (
          <p className="cartao-produto-nota">
            <span aria-hidden="true">
              <Icone nome="estrela" cheio tamanho={16} />
              <strong>{formatarMedia(avaliacao.media)}</strong>
              <span className="text-body-secondary">({avaliacao.total})</span>
            </span>
            <span className="visually-hidden">
              Nota {formatarMedia(avaliacao.media)} de 5,{' '}
              {textoDasAvaliacoes(avaliacao.total)}
            </span>
          </p>
        )}
        {biologico && (
          <span className="selo selo-biologico align-self-start">
            Biológico
          </span>
        )}
        {podeComprar && (
          <div className="mt-auto pt-3">
            {noCarrinho > 0 ? (
              <Quantidade
                nome={nome}
                valor={noCarrinho}
                maximo={stock}
                aoMudar={(quantidade) => definir(produto, quantidade)}
              />
            ) : (
              <button
                className="btn btn-suave btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1"
                type="button"
                aria-label={
                  esgotado ? undefined : `Adicionar ${nome} ao carrinho`
                }
                disabled={esgotado}
                onClick={() => definir(produto, 1)}
              >
                {!esgotado && <Icone nome="mais" tamanho={20} />}
                {esgotado ? 'Esgotado' : 'Adicionar'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
