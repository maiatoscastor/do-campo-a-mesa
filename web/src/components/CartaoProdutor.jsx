import { Link } from 'react-router';
import BotaoFavorito from './BotaoFavorito.jsx';
import Icone from './Icone.jsx';
import { enderecoDaImagem } from '../api/cliente.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';
import { iniciais } from '../utilizador.js';

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

// Um produtor num cartão (no início e na página dos produtores): o logótipo, o nome, o concelho,
// quantos produtos tem, a nota e o coração dos favoritos. A ligação para a página do produtor cobre
// o cartão todo (stretched-link do Bootstrap), e o coração fica por cima dela: um botão não pode
// estar dentro de uma ligação. O nome é um h3 dentro de uma secção e um h2 numa página só deles.
export default function CartaoProdutor({ produtor, nivel = 'h3' }) {
  const Titulo = nivel;
  const { id, nomeExploracao, avaliacao, exemplo } = produtor;
  return (
    <article className="card cartao-atalho cartao-produtor h-100">
      <div className="card-body d-flex align-items-center gap-3">
        <Logotipo produtor={produtor} />
        {/* O nome pode ocupar duas linhas: cortado, não se percebia de quem era o cartão */}
        <div className="lista-produtos-texto">
          <Titulo className="cartao-produtor-nome">
            <Link className="stretched-link" to={`/produtores/${id}`}>
              {nomeExploracao}
            </Link>
          </Titulo>
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
        <BotaoFavorito produtor={produtor} />
      </div>
    </article>
  );
}

// O mesmo produtor numa linha de uma lista (no início, ao lado dos próximos leilões), sem o coração:
// é uma pré-visualização, e a linha toda é a ligação
export function LinhaProdutor({ produtor }) {
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
