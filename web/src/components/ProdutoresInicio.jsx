import { Link } from 'react-router';
import Icone from './Icone.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';
import { enderecoDaImagem } from '../api/cliente.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';
import { iniciais } from '../utilizador.js';

const MAXIMO = 4;

// Primeiro os mais bem avaliados (e, com a mesma média, os que têm mais avaliações); depois os que
// têm mais produtos. A ordem vem toda dos dados, sem escolhas à mão.
function ordenar(a, b) {
  const media = (b.avaliacao?.media ?? 0) - (a.avaliacao?.media ?? 0);
  const avaliacoes = (b.avaliacao?.total ?? 0) - (a.avaliacao?.total ?? 0);
  return media || avaliacoes || b.produtos - a.produtos;
}

// Alguns produtores, com o logótipo, o concelho, quantos produtos têm e a nota das avaliações.
// Sozinhos, em cartões (quatro numa linha no computador); numa coluna, ao lado dos próximos leilões,
// numa lista como a dos leilões, para as duas colunas ficarem iguais.
export default function ProdutoresInicio({ produtores, naColuna = false }) {
  if (produtores.length === 0) {
    return null;
  }
  const lista = [...produtores].sort(ordenar).slice(0, MAXIMO);

  return (
    <SeccaoInicio titulo="Conheça os produtores">
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

// "Ponte de Lima · 4 produtos"
function textoDoProdutor({ localizacao, produtos }) {
  const quantos = produtos === 1 ? '1 produto' : `${produtos} produtos`;
  return localizacao?.nomeConcelho
    ? `${localizacao.nomeConcelho} · ${quantos}`
    : quantos;
}

// O logótipo ou, sem ele, as iniciais
function Logotipo({ produtor }) {
  return (
    <span className="logotipo-mini">
      {produtor.logotipoUrl ? (
        <img src={enderecoDaImagem(produtor.logotipoUrl)} alt="" />
      ) : (
        <span aria-hidden="true">{iniciais(produtor.nomeExploracao)}</span>
      )}
    </span>
  );
}

// "★ 4,5 (12)", e por extenso para os leitores de ecrã
function Nota({ avaliacao }) {
  return (
    <span className="cartao-produto-nota mb-0">
      <span aria-hidden="true">
        <Icone nome="estrela" cheio tamanho={14} />
        <strong>{formatarMedia(avaliacao.media)}</strong>
        <span className="text-body-secondary">({avaliacao.total})</span>
      </span>
      <span className="visually-hidden">
        Nota {formatarMedia(avaliacao.media)} de 5,{' '}
        {textoDasAvaliacoes(avaliacao.total)}
      </span>
    </span>
  );
}

function CartaoProdutor({ produtor }) {
  const { id, nomeExploracao, avaliacao, exemplo } = produtor;
  return (
    <Link className="card cartao-atalho h-100" to={`/produtores/${id}`}>
      <div className="card-body d-flex align-items-center gap-3">
        <Logotipo produtor={produtor} />
        {/* O nome pode ocupar duas linhas: cortado, não se percebia de quem era o cartão */}
        <div className="lista-produtos-texto">
          <p className="fw-bold lh-sm mb-1">{nomeExploracao}</p>
          <p className="small text-body-secondary mb-0">
            {textoDoProdutor(produtor)}
          </p>
          {(avaliacao || exemplo) && (
            <p className="d-flex flex-wrap align-items-center column-gap-2 row-gap-1 mt-1 mb-0">
              {avaliacao && <Nota avaliacao={avaliacao} />}
              {exemplo && <span className="selo selo-exemplo">Exemplo</span>}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function LinhaProdutor({ produtor }) {
  const { id, nomeExploracao, avaliacao, exemplo } = produtor;
  return (
    <Link className="linha-inicio" to={`/produtores/${id}`}>
      <Logotipo produtor={produtor} />
      <span className="lista-produtos-texto">
        <span className="d-flex align-items-center gap-2">
          <span className="fw-bold text-truncate">{nomeExploracao}</span>
          {exemplo && (
            <span className="selo selo-exemplo flex-shrink-0">Exemplo</span>
          )}
        </span>
        <span className="d-block small text-body-secondary text-truncate">
          {textoDoProdutor(produtor)}
        </span>
      </span>
      {avaliacao && <Nota avaliacao={avaliacao} />}
    </Link>
  );
}
