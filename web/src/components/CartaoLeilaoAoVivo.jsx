import { Link } from 'react-router';
import ImagemProduto from './ImagemProduto.jsx';
import { formatarTempo } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

// Um leilão a decorrer: a licitação atual e o tempo que falta, a contar
export default function CartaoLeilaoAoVivo({ leilao, agora }) {
  const { nome, lote, produtor, licitacaoAtual, numeroDeLicitacoes } = leilao;
  return (
    <Link
      className="card cartao-leilao h-100"
      to={`/leiloes/${leilao.id}`}
      viewTransition
    >
      <div className="cartao-leilao-topo">
        <ImagemProduto produto={leilao} />
        <div className="cartao-produto-selos">
          <span className="selo selo-direto">Em direto</span>
          {leilao.exemplo && <span className="selo selo-exemplo">Exemplo</span>}
        </div>
      </div>
      <div className="card-body">
        <h3 className="cartao-produto-nome">
          {nome} · {lote}
        </h3>
        <p className="cartao-produto-produtor">{produtor.nomeExploracao}</p>
        <div className="d-flex align-items-end justify-content-between gap-2">
          <p className="mb-0">
            <span className="d-block small text-body-secondary">
              {numeroDeLicitacoes > 0 ? 'Licitação atual' : 'Preço base'}
            </span>
            <strong className="numeros fs-5">
              {formatarPreco(licitacaoAtual.valor)}
            </strong>
          </p>
          <p className="mb-0 text-end">
            <span className="d-block small text-body-secondary">
              Termina em
            </span>
            <strong className="numeros">
              {formatarTempo(new Date(leilao.terminaEm).getTime() - agora)}
            </strong>
          </p>
        </div>
      </div>
    </Link>
  );
}
