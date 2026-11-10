import { Link } from 'react-router';
import AlertaDeErro from './AlertaDeErro.jsx';
import Icone from './Icone.jsx';
import { formatarHaQuanto, ICONES_DAS_NOTIFICACOES } from '../notificacoes.js';

// A lista das notificações: cada uma com o ícone do tipo, o texto e há quanto tempo foi, e leva à
// página a que se refere. As que estavam por ler aparecem destacadas. "aoEscolher" corre ao tocar
// numa (por exemplo, para fechar o painel).
export default function ListaNotificacoes({ notificacoes, erro, aoEscolher }) {
  if (erro) {
    return <AlertaDeErro erro={erro} />;
  }
  if (notificacoes === null) {
    return <p className="text-body-secondary small m-3">A carregar…</p>;
  }
  if (notificacoes.length === 0) {
    return (
      <div className="notificacoes-vazio">
        <Icone nome="sino" tamanho={28} />
        <p className="fw-semibold mb-0">Ainda não tem notificações</p>
        <p className="small text-body-secondary mb-0">
          Os avisos sobre as suas encomendas e leilões aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <ul className="lista-notificacoes">
      {notificacoes.map(({ id, texto, tipo, ligacao, lida, data }) => (
        <li key={id}>
          <Link
            className={`notificacao ${lida ? '' : 'notificacao-nova'}`}
            to={ligacao ?? '/'}
            onClick={aoEscolher}
          >
            <span className="notificacao-icone">
              <Icone
                nome={ICONES_DAS_NOTIFICACOES[tipo] ?? 'sino'}
                tamanho={20}
              />
            </span>
            <span className="notificacao-texto">
              {!lida && <span className="visually-hidden">Nova: </span>}
              {texto}
              <time
                className="d-block small text-body-secondary"
                dateTime={data}
              >
                {formatarHaQuanto(data)}
              </time>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
