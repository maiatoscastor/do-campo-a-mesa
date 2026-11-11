import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from './AlertaDeErro.jsx';
import AtalhoInicio from './AtalhoInicio.jsx';
import Estrelas from './Estrelas.jsx';
import Indicador from './Indicador.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import {
  formatarDia as formatarDiaDaAvaliacao,
  formatarMedia,
  textoDasAvaliacoes,
} from '../avaliacoes.js';
import {
  formatarData,
  formatarDataCurta,
  nomeDoEstado,
  porEntregar,
} from '../encomendas.js';
import { comparacao, encomendasPorPeriodo } from '../indicadores.js';
import { faseDoLeilao, formatarDia, formatarHora } from '../leiloes.js';
import { formatarPreco, STOCK_BAIXO } from '../produtos.js';
import { primeiroNome } from '../utilizador.js';

// O que falta fazer a cada encomenda, como aparece no cartão ("2 por confirmar")
const POR_FAZER = {
  pendente: ['por confirmar', 'por confirmar'],
  confirmada: ['a preparar', 'a preparar'],
  pronta: ['pronta a entregar', 'prontas a entregar'],
};

function textoDasEncomendas(encomendas) {
  const partes = Object.entries(POR_FAZER)
    .map(([estado, [uma, varias]]) => {
      const quantas = encomendas.filter((e) => e.estado === estado).length;
      // O número e as palavras ficam juntos na mesma linha (espaços que não partem)
      const texto = (quantas === 1 ? uma : varias).replaceAll(' ', '\u00a0');
      return quantas > 0 && `${quantas}\u00a0${texto}`;
    })
    .filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Nada por tratar';
}

// Os produtos com 5 ou menos, primeiro os que têm menos: "Kiwi (2) · Mel (esgotado) e mais 1"
function textoDoStock(baixos) {
  if (baixos.length === 0) {
    return 'Todos os produtos com stock';
  }
  const nomes = baixos
    .slice(0, 2)
    .map(({ nome, stock }) => `${nome} (${stock === 0 ? 'esgotado' : stock})`)
    .join(' · ');
  return baixos.length > 2 ? `${nomes} e mais ${baixos.length - 2}` : nomes;
}

// O leilão a decorrer ou, se não houver, o próximo marcado
function textoDosLeiloes(leiloes) {
  const agora = Date.now();
  const aDecorrer = leiloes.filter((l) => faseDoLeilao(l, agora) === 'ativo');
  if (aDecorrer.length > 0) {
    return aDecorrer.length === 1
      ? `${aDecorrer[0].nome}: a decorrer agora`
      : `${aDecorrer.length} a decorrer agora`;
  }
  const [proximo] = leiloes
    .filter((l) => faseDoLeilao(l, agora) === 'agendado')
    .sort((a, b) => new Date(a.iniciaEm) - new Date(b.iniciaEm));
  if (!proximo) {
    return 'Nenhum marcado';
  }
  return `Próximo: ${proximo.nome}, ${formatarDia(proximo.iniciaEm).toLowerCase()} às ${formatarHora(proximo.iniciaEm)}`;
}

// O início do produtor, como o painel de uma loja: o que precisa da atenção dele (encomendas por
// tratar, stock baixo, leilões e avaliações), os números dos últimos 30 dias comparados com os 30
// anteriores, e as últimas encomendas e avaliações. Antes de ser aprovado, só o aviso e a ligação
// para preparar a página.
export default function InicioProdutor() {
  const { utilizador, pedir } = useSessao();
  const aprovado = utilizador.produtor?.validacao === 'aprovado';
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  // Muda para voltar a ler tudo (por exemplo, quando chega uma encomenda nova)
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('nova-encomenda', recarregar);
  useEventoSocket('leilao-terminado', recarregar);
  useEventoSocket('nova-avaliacao', recarregar);

  useEffect(() => {
    if (!aprovado) {
      return undefined;
    }
    let cancelado = false;
    Promise.all([
      pedir('/orders/recebidas'),
      pedir('/products/meus'),
      pedir('/auctions/meus'),
      pedir(`/reviews?produtor=${utilizador.id}`),
    ])
      .then(([encomendas, produtos, leiloes, avaliacoes]) => {
        if (!cancelado) {
          setDados({ encomendas, produtos, leiloes, avaliacoes });
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [aprovado, pedir, utilizador.id, versao]);

  const cabecalho = (
    <div className="inicio-cabecalho">
      <div>
        <h1 className="mb-1">Olá, {primeiroNome(utilizador.nome)}</h1>
        <p className="text-body-secondary mb-0">
          {utilizador.produtor?.nomeExploracao} ·{' '}
          <Link to={`/produtores/${utilizador.id}`}>Ver a minha página</Link>
        </p>
      </div>
      {aprovado && !utilizador.castigo && (
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-primary" to="/conta/produtos/novo">
            Novo produto
          </Link>
          <Link className="btn btn-suave" to="/conta/leiloes/novo">
            Novo leilão
          </Link>
        </div>
      )}
    </div>
  );

  if (!aprovado) {
    return (
      <>
        {cabecalho}
        <div className="alert alert-warning mt-4" role="status">
          {utilizador.produtor?.validacao === 'rejeitado'
            ? 'A sua conta de produtor não foi aprovada.'
            : 'A sua conta de produtor está à espera de validação. Quando for aprovada, pode publicar produtos e leilões.'}
        </div>
        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <AtalhoInicio
              caminho="/conta/quinta"
              icone="quinta"
              titulo="A minha página"
              texto="Prepare a página da quinta enquanto espera"
            />
          </div>
        </div>
      </>
    );
  }

  const carregar = (calcular) => (dados ? calcular(dados) : 'A carregar…');
  const porTratar = dados?.encomendas.filter(porEntregar) ?? [];
  const baixos = (dados?.produtos ?? [])
    .filter(({ stock }) => stock <= STOCK_BAIXO)
    .sort((a, b) => a.stock - b.stock);
  const resumo = dados?.avaliacoes.resumo;
  const atalhos = [
    {
      caminho: '/conta/encomendas',
      icone: 'encomendas',
      titulo: 'Encomendas por tratar',
      texto: carregar(() => textoDasEncomendas(porTratar)),
      // A bola vermelha conta as que esperam pela confirmação dele
      numero: porTratar.filter(({ estado }) => estado === 'pendente').length,
      sufixo: 'por confirmar',
    },
    {
      caminho: '/conta/produtos',
      icone: 'caixa',
      titulo: 'Stock baixo',
      texto: carregar(({ produtos }) =>
        produtos.length === 0 ? 'Ainda não tem produtos' : textoDoStock(baixos),
      ),
      numero: baixos.length,
      sufixo: 'com stock baixo',
    },
    {
      caminho: '/conta/leiloes',
      icone: 'leiloes',
      titulo: 'Os meus leilões',
      texto: carregar(({ leiloes }) => textoDosLeiloes(leiloes)),
    },
    {
      caminho: `/produtores/${utilizador.id}/avaliacoes`,
      icone: 'estrela',
      titulo: 'Avaliações',
      texto: carregar(() =>
        resumo.total > 0
          ? `${formatarMedia(resumo.media)} de 5 · ${textoDasAvaliacoes(resumo.total)}`
          : 'Ainda sem avaliações',
      ),
    },
  ];

  return (
    <>
      {cabecalho}
      {utilizador.castigo && <AvisoDaSuspensao castigo={utilizador.castigo} />}
      <AlertaDeErro erro={erro} />

      <SeccaoInicio titulo="Por tratar">
        <div className="row row-cols-1 row-cols-md-2 g-3">
          {atalhos.map((atalho) => (
            <div className="col" key={atalho.caminho}>
              <AtalhoInicio {...atalho} />
            </div>
          ))}
        </div>
      </SeccaoInicio>

      {dados && (
        <>
          <Numeros encomendas={dados.encomendas} resumo={resumo} />
          <div className="row gx-4 colunas-inicio">
            <div className="col-lg-7">
              <UltimasEncomendas encomendas={dados.encomendas} />
            </div>
            <div className="col-lg-5">
              <UltimasAvaliacoes
                avaliacoes={dados.avaliacoes.avaliacoes}
                produtorId={utilizador.id}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// A conta de produtor suspensa: até quando, o que isso quer dizer e o motivo (a sessão volta a ser lida
// quando o administrador decide ou levanta, por isso este aviso aparece e sai sozinho)
function AvisoDaSuspensao({ castigo }) {
  return (
    <div className="alert alert-danger mt-4 mb-0" role="status">
      <p className="fw-bold mb-1">
        A sua conta de produtor está suspensa até {formatarData(castigo.ate)}.
      </p>
      <p className="mb-1">
        Até lá, os seus produtos e a sua página não aparecem na loja, e não pode
        criar produtos nem leilões. As encomendas que já recebeu continuam.
      </p>
      <p className="mb-0">Motivo: {castigo.motivo}</p>
    </div>
  );
}

// Os números dos últimos 30 dias, como no painel de uma loja online, e a nota das avaliações
function Numeros({ encomendas, resumo }) {
  const { ultimos30, anteriores30 } = encomendasPorPeriodo(encomendas);
  const media = (periodo) =>
    periodo.quantas > 0 ? periodo.valor / periodo.quantas : 0;
  return (
    <SeccaoInicio titulo="Resumo dos últimos 30 dias">
      <div className="row row-cols-2 row-cols-xl-4 g-3">
        <div className="col">
          <Indicador
            rotulo="Vendas"
            valor={formatarPreco(ultimos30.valor)}
            comparacao={comparacao(ultimos30.valor, anteriores30.valor)}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Encomendas"
            valor={ultimos30.quantas}
            comparacao={comparacao(ultimos30.quantas, anteriores30.quantas)}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Valor médio"
            valor={
              ultimos30.quantas > 0 ? formatarPreco(media(ultimos30)) : '—'
            }
            detalhe="por encomenda"
            comparacao={
              ultimos30.quantas > 0 && anteriores30.quantas > 0
                ? comparacao(media(ultimos30), media(anteriores30))
                : null
            }
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Avaliação média"
            valor={
              resumo.total > 0 ? `${formatarMedia(resumo.media)} de 5` : '—'
            }
            detalhe={
              resumo.total > 0
                ? `${textoDasAvaliacoes(resumo.total)}, desde o início`
                : 'Ainda sem avaliações'
            }
          />
        </div>
      </div>
    </SeccaoInicio>
  );
}

function UltimasEncomendas({ encomendas }) {
  return (
    <SeccaoInicio
      titulo="Últimas encomendas"
      ligacao="/conta/encomendas"
      textoDaLigacao="Ver todas"
    >
      {encomendas.length === 0 ? (
        <p className="text-body-secondary">Ainda não recebeu encomendas.</p>
      ) : (
        <ul className="list-group">
          {encomendas.slice(0, 5).map((encomenda) => (
            <li className="list-group-item p-0" key={encomenda.id}>
              <Link className="linha-inicio" to="/conta/encomendas">
                <span className="lista-produtos-texto">
                  <span className="d-block fw-bold text-truncate">
                    {encomenda.comprador.nome}
                  </span>
                  <span className="d-block small text-body-secondary">
                    {formatarPreco(encomenda.total)} ·{' '}
                    {formatarDataCurta(encomenda.createdAt)}
                  </span>
                </span>
                <span className={`selo selo-${encomenda.estado}`}>
                  {nomeDoEstado(encomenda.estado)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SeccaoInicio>
  );
}

function UltimasAvaliacoes({ avaliacoes, produtorId }) {
  return (
    <SeccaoInicio
      titulo="Últimas avaliações"
      ligacao={`/produtores/${produtorId}/avaliacoes`}
      textoDaLigacao="Ver todas"
    >
      {avaliacoes.length === 0 ? (
        <p className="text-body-secondary">Ainda não tem avaliações.</p>
      ) : (
        <ul className="list-group">
          {avaliacoes.slice(0, 3).map((avaliacao) => (
            <li className="list-group-item" key={avaliacao.id}>
              <div className="d-flex flex-wrap align-items-center column-gap-2">
                <Estrelas valor={avaliacao.classificacao} tamanho={16} />
                <span className="fw-bold">{avaliacao.autor.nome}</span>
                <span className="small text-body-secondary">
                  {formatarDiaDaAvaliacao(avaliacao.data)}
                </span>
              </div>
              <p className="small mb-0 texto-cortado">
                {avaliacao.comentario ?? (
                  <span className="text-body-secondary">Sem comentário.</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SeccaoInicio>
  );
}
