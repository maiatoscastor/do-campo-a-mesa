import { Link } from 'react-router';
import SeccaoInicio from './SeccaoInicio.jsx';
import {
  encomendasPorAcompanhar,
  formatarDataCurta,
  nomeDoEstado,
} from '../encomendas.js';
import { formatarPreco } from '../produtos.js';

// Quantas se mostram no início; as outras estão na página das encomendas
const MAXIMO = 4;

// No início do comprador: as encomendas em curso, com o estado de cada uma (a mudar em tempo real,
// porque o início volta a ler a lista quando chega um aviso), e as entregues que ainda não avaliou,
// com a ligação para as avaliar. Sem nenhuma, não mostra nada.
export default function AsSuasEncomendas({ encomendas }) {
  const lista = encomendasPorAcompanhar(encomendas);
  if (lista.length === 0) {
    return null;
  }

  return (
    <SeccaoInicio
      titulo="As suas encomendas"
      ligacao="/encomendas"
      textoDaLigacao="Ver todas"
    >
      <ul className="list-group">
        {lista.slice(0, MAXIMO).map((encomenda) => {
          const avaliar = encomenda.estado === 'entregue';
          return (
            <li className="list-group-item p-0" key={encomenda.id}>
              <Link
                className="linha-inicio"
                to={
                  avaliar
                    ? `/encomendas/${encomenda.id}/avaliar`
                    : '/encomendas'
                }
              >
                <span className="lista-produtos-texto">
                  <span className="d-block fw-bold text-truncate">
                    {encomenda.produtor.nomeExploracao}
                  </span>
                  <span className="d-block small text-body-secondary">
                    {formatarPreco(encomenda.total)} · feita a{' '}
                    {formatarDataCurta(encomenda.createdAt)}
                  </span>
                </span>
                {avaliar ? (
                  <span className="btn btn-suave btn-sm flex-shrink-0">
                    Avaliar
                  </span>
                ) : (
                  <span className={`selo selo-${encomenda.estado}`}>
                    {nomeDoEstado(encomenda.estado)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </SeccaoInicio>
  );
}
