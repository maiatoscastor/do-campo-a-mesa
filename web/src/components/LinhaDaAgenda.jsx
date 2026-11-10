import { Link } from 'react-router';
import ImagemProduto from './ImagemProduto.jsx';
import { formatarDia, formatarHora } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

// Um leilão marcado, numa linha da agenda: a hora (e o dia, fora da agenda agrupada por dias), a
// imagem, o lote, o produtor e o preço base
export default function LinhaDaAgenda({ leilao, comDia = false }) {
  const quando = comDia
    ? `${formatarDia(leilao.iniciaEm)}, ${formatarHora(leilao.iniciaEm)}`
    : formatarHora(leilao.iniciaEm);
  return (
    <Link className="agenda-leilao" to={`/leiloes/${leilao.id}`}>
      {!comDia && (
        <time className="agenda-hora" dateTime={leilao.iniciaEm}>
          {quando}
        </time>
      )}
      <ImagemProduto produto={leilao} className="imagem-produto-mini" />
      <span className="lista-produtos-texto">
        <span className="d-flex align-items-center gap-2">
          <span className="fw-bold text-truncate">
            {leilao.nome} · {leilao.lote}
          </span>
          {leilao.exemplo && (
            <span className="selo selo-exemplo flex-shrink-0">Exemplo</span>
          )}
        </span>
        <span className="d-block small text-body-secondary text-truncate">
          {comDia && (
            <time dateTime={leilao.iniciaEm}>
              {quando}
              {' · '}
            </time>
          )}
          {leilao.produtor.nomeExploracao} · base{' '}
          {formatarPreco(leilao.precoBase)}
        </span>
      </span>
    </Link>
  );
}
