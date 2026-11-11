import { Link } from 'react-router';
import SeccaoInicio from './SeccaoInicio.jsx';
import { formatarDataCurta, nomeDoEstado } from '../encomendas.js';
import { formatarHaQuanto } from '../notificacoes.js';
import { formatarPreco } from '../produtos.js';
import { PAPEIS } from '../utilizador.js';

// As listas do administrador (no início e no painel): as últimas encomendas, de todos os produtores,
// com o estado de cada uma, e os últimos registos, com o que espera por validação

export function UltimasEncomendas({ encomendas }) {
  return (
    <SeccaoInicio titulo="Últimas encomendas">
      {encomendas.length === 0 ? (
        <p className="text-body-secondary">Ainda não há encomendas.</p>
      ) : (
        <ul className="list-group">
          {encomendas.map((encomenda) => (
            <li className="list-group-item linha-inicio" key={encomenda.id}>
              <span className="lista-produtos-texto">
                <span className="d-block fw-bold text-truncate">
                  {encomenda.produtor?.nomeExploracao ?? 'Produtor removido'}
                </span>
                <span className="d-block small text-body-secondary text-truncate">
                  {encomenda.comprador ?? 'Comprador removido'} ·{' '}
                  {formatarPreco(encomenda.total)} ·{' '}
                  {formatarDataCurta(encomenda.data)}
                  {encomenda.origem === 'leilao' && ' · leilão'}
                </span>
              </span>
              <span className={`selo selo-${encomenda.estado}`}>
                {nomeDoEstado(encomenda.estado)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SeccaoInicio>
  );
}

export function UltimosRegistos({ registos }) {
  return (
    <SeccaoInicio titulo="Últimos registos">
      <ul className="list-group">
        {registos.map((registo) => (
          <li className="list-group-item linha-inicio" key={registo.id}>
            <span className="lista-produtos-texto">
              <span className="d-block fw-bold text-truncate">
                {registo.nomeExploracao ?? registo.nome}
              </span>
              <span className="d-block small text-body-secondary text-truncate">
                {PAPEIS[registo.papel]}
                {registo.nomeExploracao && ` · ${registo.nome}`} ·{' '}
                {formatarHaQuanto(registo.data)}
              </span>
            </span>
            {registo.validacao === 'pendente' && (
              <Link className="selo selo-por-decidir" to="/admin/produtores">
                Por validar
              </Link>
            )}
            {registo.exemplo && (
              <span className="selo selo-exemplo">Exemplo</span>
            )}
          </li>
        ))}
      </ul>
    </SeccaoInicio>
  );
}
