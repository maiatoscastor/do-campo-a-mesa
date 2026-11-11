import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Indicador from '../components/Indicador.jsx';
import {
  UltimasEncomendas,
  UltimosRegistos,
} from '../components/ListasDoPainel.jsx';
import SeccaoInicio from '../components/SeccaoInicio.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { textoPorFazer } from '../encomendas.js';
import { comparacao } from '../indicadores.js';
import { formatarTempo } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

// De quanto em quanto tempo o painel é lido outra vez, para as licitações e as pessoas nas salas dos
// leilões (o resto também muda logo, com o aviso painel-mudou do servidor)
const ATUALIZAR = 10000;

// "1 comprador", "3 compradores"
function contar(numero, singular, plural) {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

// O painel global do administrador (/admin/painel): os utilizadores (e os produtores por estado), as
// encomendas (dos últimos 30 dias e de sempre por estado), os leilões a decorrer com a licitação e
// as pessoas a ver, e as últimas encomendas e registos. Em tempo real: volta a ser lido quando o
// servidor avisa que alguma coisa mudou, e de 10 em 10 segundos por causa das licitações.
export default function PainelAdmin() {
  const { pedir } = useSessao();
  const [painel, setPainel] = useState(null);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('painel-mudou', recarregar);
  useEventoSocket('produtores-mudaram', recarregar);

  useEffect(() => {
    let cancelado = false;
    const ler = () =>
      pedir('/admin/painel')
        .then((dados) => {
          if (!cancelado) {
            setPainel(dados);
            setErro(null);
          }
        })
        .catch((problema) => !cancelado && setErro(problema));
    ler();
    const relogio = setInterval(ler, ATUALIZAR);
    return () => {
      cancelado = true;
      clearInterval(relogio);
    };
  }, [pedir, versao]);

  return (
    <>
      <title>Painel · Do Campo à Mesa</title>
      <h1 className="mb-1">Painel</h1>
      <p className="text-body-secondary">
        A aplicação toda, atualizada em tempo real.
      </p>
      <AlertaDeErro erro={erro} />
      {!painel && !erro && <p className="text-body-secondary">A carregar…</p>}
      {painel && (
        <>
          <Utilizadores utilizadores={painel.utilizadores} />
          <Encomendas encomendas={painel.encomendas} />
          <LeiloesADecorrer leiloes={painel.leiloes} />
          <div className="par-inicio">
            <UltimasEncomendas encomendas={painel.ultimasEncomendas} />
            <UltimosRegistos registos={painel.ultimosRegistos} />
          </div>
        </>
      )}
    </>
  );
}

function Utilizadores({ utilizadores }) {
  const { compradores, produtores, novos, produtoresPorEstado } = utilizadores;
  const { aprovados, porValidar, rejeitados, suspensos, banidos } =
    produtoresPorEstado;
  return (
    <SeccaoInicio titulo="Utilizadores">
      <div className="row row-cols-2 row-cols-xl-4 g-3">
        <div className="col">
          <Indicador rotulo="Compradores" valor={compradores} />
        </div>
        <div className="col">
          <Indicador
            rotulo="Produtores"
            valor={produtores}
            detalhe={`${contar(aprovados, 'aprovado', 'aprovados')} · ${porValidar} por validar${rejeitados > 0 ? ` · ${contar(rejeitados, 'rejeitado', 'rejeitados')}` : ''}`}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Castigos em vigor"
            valor={suspensos + banidos}
            detalhe={`${contar(suspensos, 'suspenso', 'suspensos')} · ${contar(banidos, 'banido', 'banidos')}`}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Novos"
            valor={novos}
            detalhe="registados nos últimos 30 dias"
          />
        </div>
      </div>
    </SeccaoInicio>
  );
}

function Encomendas({ encomendas }) {
  const { ultimos30, anteriores30, porEstado } = encomendas;
  const emCurso =
    (porEstado.pendente ?? 0) +
    (porEstado.confirmada ?? 0) +
    (porEstado.pronta ?? 0);
  return (
    <SeccaoInicio titulo="Encomendas">
      <div className="row row-cols-2 row-cols-xl-4 g-3">
        <div className="col">
          <Indicador
            rotulo="Últimos 30 dias"
            valor={formatarPreco(ultimos30.valor)}
            detalhe={contar(ultimos30.quantas, 'encomenda', 'encomendas')}
            comparacao={comparacao(ultimos30.valor, anteriores30.valor)}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Em curso"
            valor={emCurso}
            detalhe={textoPorFazer(porEstado)}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Entregues"
            valor={porEstado.entregue ?? 0}
            detalhe="desde o início"
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Canceladas"
            valor={porEstado.cancelada ?? 0}
            detalhe="de produtores banidos"
          />
        </div>
      </div>
    </SeccaoInicio>
  );
}

// Os leilões a decorrer, com a licitação atual, as pessoas na sala e o tempo que falta (a contar)
function LeiloesADecorrer({ leiloes }) {
  const agora = useAgora();
  return (
    <SeccaoInicio
      titulo={`Leilões a decorrer (${leiloes.aDecorrer})`}
      ligacao="/leiloes"
      textoDaLigacao={`Ver a agenda · ${contar(leiloes.marcados, 'marcado', 'marcados')}`}
    >
      {leiloes.lista.length === 0 ? (
        <p className="text-body-secondary">Nenhum leilão a decorrer agora.</p>
      ) : (
        <ul className="list-group">
          {leiloes.lista.map((leilao) => (
            <li className="list-group-item p-0" key={leilao.id}>
              <Link className="linha-inicio" to={`/leiloes/${leilao.id}`}>
                <span className="lista-produtos-texto">
                  <span className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-truncate">
                      {leilao.nome} · {leilao.lote}
                    </span>
                    {leilao.exemplo && (
                      <span className="selo selo-exemplo flex-shrink-0">
                        Exemplo
                      </span>
                    )}
                  </span>
                  <span className="d-block small text-body-secondary text-truncate">
                    {leilao.produtor?.nomeExploracao} ·{' '}
                    {contar(
                      leilao.numeroDeLicitacoes,
                      'licitação',
                      'licitações',
                    )}
                    {leilao.participantes !== null &&
                      ` · ${leilao.participantes} a ver`}
                  </span>
                </span>
                <span className="text-end flex-shrink-0">
                  <strong className="d-block numeros">
                    {formatarPreco(leilao.licitacaoAtual)}
                  </strong>
                  <span className="small text-body-secondary numeros">
                    {formatarTempo(
                      new Date(leilao.terminaEm).getTime() - agora,
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SeccaoInicio>
  );
}
