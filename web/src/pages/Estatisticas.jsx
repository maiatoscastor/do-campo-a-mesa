import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import GraficoDeColunas from '../components/GraficoDeColunas.jsx';
import Indicador from '../components/Indicador.jsx';
import ResumoDasAvaliacoes from '../components/ResumoDasAvaliacoes.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';
import { ESTADOS, nomeDoEstado } from '../encomendas.js';
import { comparacao } from '../indicadores.js';
import { formatarPreco } from '../produtos.js';

// Os períodos que a API conhece (em dias), com o nome do botão e o do período anterior
const PERIODOS = [
  { dias: 7, nome: '7 dias', anterior: '7 dias anteriores' },
  { dias: 30, nome: '30 dias', anterior: '30 dias anteriores' },
  { dias: 90, nome: '90 dias', anterior: '90 dias anteriores' },
  { dias: 365, nome: '12 meses', anterior: '12 meses anteriores' },
];

const AGRUPAMENTOS = { dia: 'por dia', semana: 'por semana', mes: 'por mês' };

const EUROS_INTEIROS = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DIA_CURTO = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'numeric',
});
const DIA_LONGO = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const DIA_DO_MES = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'long',
});
const MES_CURTO = new Intl.DateTimeFormat('pt-PT', { month: 'short' });
const MES_LONGO = new Intl.DateTimeFormat('pt-PT', {
  month: 'long',
  year: 'numeric',
});

// No eixo do gráfico, euros sem cêntimos ("25 €"); no resto, com cêntimos
function formatarValor(valor, { curto = false } = {}) {
  return curto ? EUROS_INTEIROS.format(valor) : formatarPreco(valor);
}

// "2026-11-11" como data local (sem fuso), para escrever o dia
function dataLocal(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// As barras do gráfico a partir da série da API: o rótulo curto do eixo e o longo da dica e da tabela
function barrasDoGrafico(serie, agrupamento) {
  return serie.map(({ inicio, valor, encomendas }) => {
    const data = dataLocal(inicio);
    const barra = {
      valor,
      detalhe: encomendas === 1 ? '1 encomenda' : `${encomendas} encomendas`,
    };
    if (agrupamento === 'mes') {
      const ano = String(data.getFullYear()).slice(2);
      return {
        ...barra,
        rotulo: `${MES_CURTO.format(data).replace('.', '')} ${ano}`,
        rotuloLongo: maiuscula(MES_LONGO.format(data)),
      };
    }
    if (agrupamento === 'semana') {
      return {
        ...barra,
        rotulo: DIA_CURTO.format(data),
        rotuloLongo: `Semana a partir de ${DIA_DO_MES.format(data)}`,
      };
    }
    return {
      ...barra,
      rotulo: DIA_CURTO.format(data),
      rotuloLongo: maiuscula(DIA_LONGO.format(data)),
    };
  });
}

// As estatísticas do produtor (/conta/estatisticas): as vendas, as encomendas, o valor médio e a
// avaliação no topo, comparados com o período anterior; as vendas no gráfico; os produtos mais
// vendidos; as encomendas por estado e os leilões; e as avaliações. O período fica no endereço
// (?periodo=90). Tudo volta a ser lido quando chega uma encomenda nova.
export default function Estatisticas() {
  const { utilizador, pedir } = useSessao();
  const [parametros, setParametros] = useSearchParams();
  const periodo =
    PERIODOS.find(({ dias }) => String(dias) === parametros.get('periodo')) ??
    PERIODOS[1];
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);
  useEventoSocket('nova-encomenda', () => setVersao((n) => n + 1));

  useEffect(() => {
    let cancelado = false;
    pedir(`/producers/eu/estatisticas?periodo=${periodo.dias}`)
      .then((lidos) => {
        if (!cancelado) {
          setDados(lidos);
          setErro(null);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, periodo.dias, versao]);

  // Ao mudar de período, os números anteriores ficam à vista (mais claros) até chegarem os novos
  const aAtualizar = dados && dados.periodo.dias !== periodo.dias;

  return (
    <>
      <title>Estatísticas · Do Campo à Mesa</title>
      <h1 className="mb-3">Estatísticas</h1>

      <fieldset className="escolhas mb-3">
        <legend className="visually-hidden">Período</legend>
        {PERIODOS.map(({ dias, nome }) => (
          <span key={dias}>
            <input
              id={`periodo-${dias}`}
              className="btn-check"
              type="radio"
              name="periodo"
              checked={periodo.dias === dias}
              onChange={() =>
                setParametros(dias === 30 ? {} : { periodo: dias }, {
                  replace: true,
                })
              }
            />
            <label className="btn btn-escolha" htmlFor={`periodo-${dias}`}>
              {nome}
            </label>
          </span>
        ))}
      </fieldset>

      <AlertaDeErro erro={erro} />
      {!dados && !erro && <p className="text-body-secondary">A carregar…</p>}
      {dados && (
        <div
          className={aAtualizar ? 'a-atualizar' : undefined}
          aria-busy={aAtualizar || undefined}
        >
          <Numeros dados={dados} periodo={periodo} />
          <Vendas dados={dados} periodo={periodo} />
          <div className="par-inicio">
            <MaisVendidos produtos={dados.produtos} />
            <EncomendasELeiloes dados={dados} />
          </div>
          <Avaliacoes resumo={dados.avaliacao} produtorId={utilizador.id} />
        </div>
      )}
    </>
  );
}

function Numeros({ dados, periodo }) {
  const { vendas, anterior, avaliacao } = dados;
  return (
    <section aria-label="Resumo do período">
      <div className="row row-cols-2 row-cols-xl-4 g-3">
        <div className="col">
          <Indicador
            rotulo="Vendas"
            valor={formatarPreco(vendas.valor)}
            comparacao={comparacao(
              vendas.valor,
              anterior.valor,
              periodo.anterior,
            )}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Encomendas"
            valor={vendas.encomendas}
            comparacao={comparacao(
              vendas.encomendas,
              anterior.encomendas,
              periodo.anterior,
            )}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Valor médio"
            valor={
              vendas.encomendas > 0 ? formatarPreco(vendas.valorMedio) : '—'
            }
            detalhe="por encomenda"
            comparacao={
              vendas.encomendas > 0 && anterior.encomendas > 0
                ? comparacao(
                    vendas.valorMedio,
                    anterior.valorMedio,
                    periodo.anterior,
                  )
                : null
            }
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Avaliação média"
            valor={
              avaliacao.total > 0
                ? `${formatarMedia(avaliacao.media)} de 5`
                : '—'
            }
            detalhe={
              avaliacao.total > 0
                ? `${textoDasAvaliacoes(avaliacao.total)}, desde o início`
                : 'Ainda sem avaliações'
            }
          />
        </div>
      </div>
    </section>
  );
}

function Vendas({ dados, periodo }) {
  const { serie, vendas } = dados;
  const agrupamento = AGRUPAMENTOS[dados.periodo.agrupamento];
  return (
    <section className="seccao-inicio" aria-labelledby="vendas-no-tempo">
      <h2 className="h5" id="vendas-no-tempo">
        Vendas {agrupamento}
      </h2>
      {vendas.encomendas === 0 ? (
        <p className="text-body-secondary">
          Ainda não há vendas nos últimos {periodo.nome}.
        </p>
      ) : (
        <GraficoDeColunas
          barras={barrasDoGrafico(serie, dados.periodo.agrupamento)}
          formatarValor={formatarValor}
          descricao={`Gráfico das vendas ${agrupamento} nos últimos ${periodo.nome}, num total de ${formatarPreco(vendas.valor)}`}
        />
      )}
    </section>
  );
}

// Os mais vendidos, ordenados pelo valor: o nome e os números em cima, uma barra por baixo, todas
// com a mesma cor e medidas pela maior
function MaisVendidos({ produtos }) {
  const maximo = Math.max(...produtos.map(({ valor }) => valor), 0);
  return (
    <section className="seccao-inicio" aria-labelledby="mais-vendidos">
      <h2 className="h5" id="mais-vendidos">
        Produtos mais vendidos
      </h2>
      {produtos.length === 0 ? (
        <p className="text-body-secondary">Ainda não vendeu nenhum produto.</p>
      ) : (
        <ol className="barras-ordenadas">
          {produtos.map(({ id, nome, unidade, quantidade, valor }) => (
            <li key={id}>
              <span className="barras-ordenadas-texto">
                <span className="fw-semibold text-truncate">{nome}</span>
                <span className="numeros">
                  {formatarPreco(valor)}
                  <span className="text-body-secondary">
                    {' · '}
                    {quantidade} {unidade}
                  </span>
                </span>
              </span>
              <span className="barras-ordenadas-calha" aria-hidden="true">
                <span
                  className="barras-ordenadas-barra"
                  style={{
                    width: `${maximo > 0 ? (valor / maximo) * 100 : 0}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EncomendasELeiloes({ dados }) {
  const { estados, leiloes } = dados;
  const lista = [...ESTADOS.map(({ estado }) => estado), 'cancelada'];
  let textoDosLeiloes = 'Nenhum leilão acabou neste período.';
  if (leiloes.terminados > 0) {
    const acabaram =
      leiloes.terminados === 1
        ? '1 leilão acabou'
        : `${leiloes.terminados} leilões acabaram`;
    const vendidos =
      leiloes.vendidos === 1 ? '1 vendido' : `${leiloes.vendidos} vendidos`;
    textoDosLeiloes =
      leiloes.vendidos > 0
        ? `${acabaram}: ${vendidos}, por ${formatarPreco(leiloes.valor)} no total.`
        : `${acabaram}, sem licitações.`;
  }
  return (
    <section className="seccao-inicio" aria-labelledby="encomendas-por-estado">
      <h2 className="h5" id="encomendas-por-estado">
        Encomendas do período
      </h2>
      <ul className="list-group mb-3">
        {lista.map((estado) => (
          <li className="list-group-item linha-inicio" key={estado}>
            <span className={`selo selo-${estado}`}>
              {nomeDoEstado(estado)}
            </span>
            <span className="numeros fw-semibold">{estados[estado] ?? 0}</span>
          </li>
        ))}
      </ul>
      <h3 className="h6">Leilões</h3>
      <p className="mb-0">{textoDosLeiloes}</p>
    </section>
  );
}

function Avaliacoes({ resumo, produtorId }) {
  const ligacao = `/produtores/${produtorId}/avaliacoes`;
  return (
    <section className="seccao-inicio" aria-labelledby="avaliacoes-recebidas">
      <h2 className="h5" id="avaliacoes-recebidas">
        Avaliações
      </h2>
      {resumo.total === 0 ? (
        <p className="text-body-secondary">Ainda não tem avaliações.</p>
      ) : (
        <ResumoDasAvaliacoes resumo={resumo} ligacao={ligacao}>
          <Link className="btn btn-suave" to={ligacao}>
            Ler as avaliações
          </Link>
        </ResumoDasAvaliacoes>
      )}
    </section>
  );
}
