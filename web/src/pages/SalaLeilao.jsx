import { useState } from 'react';
import { Link, useParams } from 'react-router';
import EstadoVazio from '../components/EstadoVazio.jsx';
import Icone from '../components/Icone.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { useLeilao } from '../hooks/useLeilao.js';
import { useSessao } from '../hooks/useSessao.js';
import {
  ATALHOS,
  faseDoLeilao,
  formatarDia,
  formatarHora,
  formatarTempo,
} from '../leiloes.js';
import { textoDaLocalizacao } from '../localizacao.js';
import { formatarPreco } from '../produtos.js';

// "225,50" passa a 225.5; um valor que não é número dá NaN
function lerValor(texto) {
  return Number(texto.trim().replace(',', '.'));
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

// A sala de um leilão em direto: a licitação atual, a contagem decrescente acertada com o relógio do
// servidor, quem está a ver, o histórico e o formulário para licitar. Aberta a todos; para licitar
// é preciso entrar.
export default function SalaLeilao() {
  const { id } = useParams();
  const {
    leilao,
    licitacoes,
    participantes,
    diferenca,
    ligado,
    erro,
    licitar,
  } = useLeilao(id);
  const agora = useAgora(diferenca);

  if (!leilao) {
    return (
      <>
        <title>Leilão · Do Campo à Mesa</title>
        {erro ? (
          <EstadoVazio
            icone="leiloes"
            titulo="Leilão não encontrado"
            texto="Pode ter sido cancelado pelo produtor."
          >
            <Link className="btn btn-primary" to="/leiloes">
              Ver leilões
            </Link>
          </EstadoVazio>
        ) : (
          <p className="text-body-secondary">
            {ligado ? 'A carregar…' : 'A ligar ao leilão…'}
          </p>
        )}
      </>
    );
  }

  const fase = faseDoLeilao(leilao, agora);
  const { nome, lote, descricao, produtor, licitacaoAtual } = leilao;
  const comLicitacoes = leilao.numeroDeLicitacoes > 0;

  return (
    <>
      <title>{`${nome} · Leilão · Do Campo à Mesa`}</title>
      <Link className="small d-inline-block mb-2" to="/leiloes" viewTransition>
        ← Leilões
      </Link>
      <div className="sala-leilao">
        <div className="sala-leilao-lote">
          <div className="d-flex gap-3 align-items-center mb-3">
            <ImagemProduto produto={leilao} className="imagem-leilao" />
            <div className="lista-produtos-texto">
              <h1 className="h3 mb-1">
                {nome}
                {leilao.exemplo && (
                  <span className="selo selo-exemplo align-middle ms-2">
                    Exemplo
                  </span>
                )}
              </h1>
              <p className="mb-1 fw-semibold">Lote: {lote}</p>
              <p className="small text-body-secondary mb-0">
                <Link to={`/produtores/${produtor.id}`}>
                  {produtor.nomeExploracao}
                </Link>
                {produtor.localizacao &&
                  ` · ${textoDaLocalizacao(produtor.localizacao)}`}
              </p>
            </div>
          </div>
          {descricao && <p>{descricao}</p>}
          <p className="small text-body-secondary">
            Preço base {formatarPreco(leilao.precoBase)} · cada licitação sobe
            pelo menos {formatarPreco(leilao.incremento)}
          </p>
        </div>

        <div className="sala-leilao-painel">
          <section className="card painel-leilao" aria-label="Leilão em direto">
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <SeloDaFase fase={fase} />
                <span
                  className="small text-body-secondary ms-auto d-inline-flex align-items-center gap-1"
                  title="Pessoas a ver este leilão agora"
                >
                  <Icone nome="pessoas" tamanho={18} />
                  {participantes} a ver
                </span>
              </div>

              <Contagem leilao={leilao} fase={fase} agora={agora} />

              <p className="mb-0 small text-body-secondary">
                {comLicitacoes ? 'Licitação atual' : 'Preço base'}
              </p>
              {/* Anunciado aos leitores de ecrã sempre que muda */}
              <p className="licitacao-atual numeros" aria-live="polite">
                {formatarPreco(licitacaoAtual.valor)}
              </p>
              <p className="small text-body-secondary">
                {comLicitacoes
                  ? `de ${licitacaoAtual.nome} · ${leilao.numeroDeLicitacoes} ${
                      leilao.numeroDeLicitacoes === 1
                        ? 'licitação'
                        : 'licitações'
                    }`
                  : 'Ainda ninguém licitou'}
              </p>

              {!ligado && (
                <p className="small text-danger-emphasis" role="status">
                  Ligação perdida. A tentar voltar a ligar…
                </p>
              )}

              <AcaoDoLeilao
                key={leilao.id}
                leilao={leilao}
                fase={fase}
                licitar={licitar}
              />
            </div>
          </section>
        </div>

        <section className="sala-leilao-historico" aria-labelledby="historico">
          <Historico licitacoes={licitacoes} />
        </section>
      </div>
    </>
  );
}

function SeloDaFase({ fase }) {
  if (fase === 'ativo') {
    return <span className="selo selo-direto">Em direto</span>;
  }
  if (fase === 'agendado') {
    return <span className="selo selo-confirmada">Agendado</span>;
  }
  if (fase === 'cancelado') {
    return <span className="selo selo-cancelado">Cancelado</span>;
  }
  return <span className="selo selo-entregue">Terminado</span>;
}

// O tempo que falta para começar ou acabar
function Contagem({ leilao, fase, agora }) {
  if (fase === 'agendado') {
    return (
      <p className="contagem-leilao">
        <span className="contagem-rotulo">
          Começa {formatarDia(leilao.iniciaEm).toLowerCase()} às{' '}
          {formatarHora(leilao.iniciaEm)}, daqui a
        </span>
        <span className="numeros">
          {formatarTempo(new Date(leilao.iniciaEm).getTime() - agora)}
        </span>
      </p>
    );
  }
  if (fase === 'ativo') {
    const restante = new Date(leilao.terminaEm).getTime() - agora;
    return (
      <p
        className={`contagem-leilao ${restante < 60000 ? 'contagem-final' : ''}`}
      >
        <span className="contagem-rotulo">Termina em</span>
        {/* Só a hora de fim é anunciada, e não cada segundo: seria demasiado para um leitor de ecrã */}
        <span className="numeros" role="timer" aria-live="off">
          {formatarTempo(restante)}
        </span>
        {restante <= 30000 && (
          <span className="contagem-rotulo mt-1">
            Licitar agora prolonga o leilão 30 s
          </span>
        )}
      </p>
    );
  }
  return null;
}

// O que cada pessoa pode fazer: licitar, entrar para licitar, ou ver o resultado
function AcaoDoLeilao({ leilao, fase, licitar }) {
  const { utilizador } = useSessao();
  const { licitacaoAtual } = leilao;
  const comLicitacoes = leilao.numeroDeLicitacoes > 0;
  const souEu = utilizador && licitacaoAtual.comprador === utilizador.id;

  if (fase === 'cancelado') {
    return (
      <p className="fw-semibold mb-0">
        Este leilão foi cancelado. As licitações deixaram de contar.
      </p>
    );
  }
  if (fase === 'terminado' || fase === 'a fechar') {
    if (fase === 'a fechar') {
      return <p className="fw-semibold mb-0">O tempo acabou. A fechar…</p>;
    }
    if (!comLicitacoes) {
      return <p className="fw-semibold mb-0">Terminou sem licitações.</p>;
    }
    return souEu ? (
      <div className="alert alert-success mb-0" role="status">
        Ganhou este leilão por {formatarPreco(licitacaoAtual.valor)}.{' '}
        <Link className="alert-link" to="/encomendas">
          Ver a encomenda
        </Link>
      </div>
    ) : (
      <p className="fw-semibold mb-0">
        Vendido a {licitacaoAtual.nome} por{' '}
        {formatarPreco(licitacaoAtual.valor)}.
      </p>
    );
  }

  if (!utilizador) {
    return (
      <div className="d-grid gap-2">
        <Link
          className="btn btn-primary"
          to="/entrar"
          state={{ depois: `/leiloes/${leilao.id}` }}
          viewTransition
        >
          Entrar para licitar
        </Link>
      </div>
    );
  }
  if (utilizador.id === leilao.produtor.id) {
    return (
      <p className="mb-0">Este leilão é seu: acompanhe-o aqui em direto.</p>
    );
  }
  if (utilizador.papel === 'admin') {
    return null;
  }

  return (
    <FormularioDeLicitacao
      leilao={leilao}
      ativo={fase === 'ativo'}
      souEu={souEu}
      licitar={licitar}
    />
  );
}

// O valor a licitar: sem nada escrito, licita-se o mínimo; os atalhos somam +5, +10 ou +25 € à
// licitação atual. Abaixo do mínimo, o botão fica desligado (o mínimo muda em direto quando outra
// pessoa licita), e o servidor volta a confirmar, porque duas pessoas podem licitar ao mesmo tempo.
function FormularioDeLicitacao({ leilao, ativo, souEu, licitar }) {
  const [texto, setTexto] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState('');
  const { minimo } = leilao;
  const atual = leilao.licitacaoAtual.valor;
  // O valor que vai ser enviado, e que o botão mostra
  const pedido = texto.trim() ? lerValor(texto) : minimo;
  const valido = Number.isFinite(pedido);
  const abaixo = valido && pedido < minimo;

  async function enviar(evento) {
    evento.preventDefault();
    setAEnviar(true);
    setErro('');
    const resposta = await licitar(arredondar(pedido));
    setAEnviar(false);
    if (resposta.ok) {
      setTexto('');
    } else {
      setErro(resposta.erro);
    }
  }

  // Quem já tem a licitação mais alta espera que alguém passe à frente
  const podeLicitar = ativo && !souEu;

  return (
    <form onSubmit={enviar} noValidate>
      {souEu && (
        <p className="fw-semibold text-success-emphasis mb-2">
          A sua licitação é a mais alta. Pode voltar a licitar quando alguém
          passar à frente.
        </p>
      )}
      <div className="atalhos-licitacao mb-2">
        {ATALHOS.map((soma) => {
          const proposta = Math.max(minimo, arredondar(atual + soma));
          return (
            <button
              key={soma}
              className="btn btn-suave btn-sm"
              type="button"
              disabled={!podeLicitar}
              onClick={() => setTexto(proposta.toFixed(2).replace('.', ','))}
            >
              +{soma} €
            </button>
          );
        })}
      </div>
      <label className="form-label small mb-1" htmlFor="valor-licitacao">
        O seu valor (mínimo {formatarPreco(minimo)})
      </label>
      <input
        id="valor-licitacao"
        className="form-control numeros"
        inputMode="decimal"
        autoComplete="off"
        placeholder={minimo.toFixed(2).replace('.', ',')}
        value={texto}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setErro('');
        }}
        aria-invalid={!valido || abaixo ? true : undefined}
        aria-describedby="aviso-licitacao"
        disabled={!podeLicitar}
      />
      <button
        className="btn btn-primary w-100 mt-2 d-inline-flex align-items-center justify-content-center gap-2"
        type="submit"
        disabled={!podeLicitar || aEnviar || !valido || abaixo}
      >
        <Icone nome="leiloes" tamanho={20} />
        {aEnviar
          ? 'A licitar…'
          : `Licitar${valido ? ` ${formatarPreco(pedido)}` : ''}`}
      </button>
      <p
        id="aviso-licitacao"
        className="small mt-2 mb-0 fw-semibold text-danger-emphasis"
        role="alert"
      >
        {!ativo && (
          <span className="fw-normal text-body-secondary">
            Pode licitar quando o leilão começar.
          </span>
        )}
        {podeLicitar &&
          !valido &&
          'Escreva um valor em euros, por exemplo 225,50.'}
        {podeLicitar &&
          abaixo &&
          `Abaixo do mínimo: tem de ser pelo menos ${formatarPreco(minimo)}.`}
        {podeLicitar && valido && !abaixo && erro}
      </p>
    </form>
  );
}

// As últimas licitações aceites, da mais recente para a mais antiga
function Historico({ licitacoes }) {
  return (
    <>
      <h2 className="h6" id="historico">
        Licitações
      </h2>
      {licitacoes.length === 0 ? (
        <p className="small text-body-secondary">Ainda não há licitações.</p>
      ) : (
        <ol className="historico-licitacoes" aria-live="polite">
          {licitacoes.map((licitacao) => (
            <li key={licitacao.id}>
              <span className="fw-semibold">{licitacao.nome}</span>
              <time
                className="small text-body-secondary"
                dateTime={licitacao.data}
              >
                {formatarHora(licitacao.data)}
              </time>
              <span className="ms-auto numeros fw-bold">
                {formatarPreco(licitacao.valor)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
