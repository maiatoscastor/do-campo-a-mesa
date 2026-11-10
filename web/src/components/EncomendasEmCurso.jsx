import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { ESTADOS, formatarDataCurta } from '../encomendas.js';
import { formatarPreco } from '../produtos.js';

// Quantas se mostram no início; as outras estão na página das encomendas
const MAXIMO = 3;

// No início do comprador: as encomendas que ainda não foram entregues, com o estado de cada uma, a
// mudar em tempo real. Sem nenhuma em curso, não mostra nada.
export default function EncomendasEmCurso() {
  const { pedir } = useSessao();
  const [encomendas, setEncomendas] = useState([]);
  // Muda para voltar a ler a lista (quando o produtor muda o estado de uma)
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('encomenda-atualizada', recarregar);
  useEventoSocket('leilao-ganho', recarregar);

  useEffect(() => {
    let cancelado = false;
    pedir('/orders')
      .then((lista) => !cancelado && setEncomendas(lista))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [pedir, versao]);

  const emCurso = encomendas.filter(({ estado }) => estado !== 'entregue');
  if (emCurso.length === 0) {
    return null;
  }

  return (
    <section className="mt-4" aria-labelledby="encomendas-em-curso">
      <div className="d-flex align-items-baseline justify-content-between gap-2 mb-2">
        <h2 className="h5 mb-0" id="encomendas-em-curso">
          Encomendas em curso
        </h2>
        {emCurso.length > MAXIMO && (
          <Link className="small" to="/encomendas">
            Ver as {emCurso.length}
          </Link>
        )}
      </div>
      <ul className="list-group">
        {emCurso.slice(0, MAXIMO).map((encomenda) => (
          <li className="list-group-item p-0" key={encomenda.id}>
            <Link className="encomenda-em-curso" to="/encomendas">
              <span className="lista-produtos-texto">
                <span className="d-block fw-bold text-truncate">
                  {encomenda.produtor.nomeExploracao}
                </span>
                <span className="d-block small text-body-secondary">
                  {formatarPreco(encomenda.total)} · feita a{' '}
                  {formatarDataCurta(encomenda.createdAt)}
                </span>
              </span>
              <span className={`selo selo-${encomenda.estado}`}>
                {ESTADOS.find(({ estado }) => estado === encomenda.estado).nome}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
