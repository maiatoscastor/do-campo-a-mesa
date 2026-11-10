import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, enderecoDaImagem } from '../api/cliente.js';
import CartaoProduto from '../components/CartaoProduto.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import HorarioLevantamento from '../components/HorarioLevantamento.jsx';
import Icone from '../components/Icone.jsx';
import MapaQuinta from '../components/MapaQuinta.jsx';
import ResumoDasAvaliacoes from '../components/ResumoDasAvaliacoes.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { useSessao } from '../hooks/useSessao.js';
import {
  faseDoLeilao,
  formatarDia,
  formatarHora,
  formatarTempo,
} from '../leiloes.js';
import { textoDaLocalizacao } from '../localizacao.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';
import {
  enderecoNoMaps,
  formatarMesEAno,
  ligacoesDosContactos,
} from '../paginaDoProdutor.js';
import { iniciais } from '../utilizador.js';

// A página pública de um produtor (/produtores/:id): capa, logótipo, história, levantamento na
// quinta, contactos, mapa, produtos e leilões. Cada secção só aparece se tiver conteúdo. O próprio
// produtor vê a sua página mesmo antes de ser aprovado, com um aviso de que ainda não é pública.
export default function PaginaProdutor() {
  const { id } = useParams();
  const { utilizador, pedir } = useSessao();
  const souEu = utilizador?.id === id;
  const [pagina, setPagina] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [leiloes, setLeiloes] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    const lerPagina = souEu ? pedir('/producers/eu') : api(`/producers/${id}`);
    Promise.all([
      lerPagina,
      api(`/products?produtor=${id}`),
      api(`/auctions?produtor=${id}`),
    ])
      .then(([dados, deProdutos, deLeiloes]) => {
        if (!cancelado) {
          setPagina(dados);
          setProdutos(deProdutos);
          setLeiloes(deLeiloes);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [id, souEu, pedir]);

  if (erro) {
    // Um identificador mal escrito (400) é, para quem o abre, o mesmo que um que não existe (404)
    const naoExiste = erro.estado === 404 || erro.estado === 400;
    return (
      <>
        <title>Produtor · Do Campo à Mesa</title>
        <EstadoVazio
          icone="quinta"
          titulo={naoExiste ? 'Produtor não encontrado' : 'Algo correu mal'}
          texto={
            naoExiste
              ? 'O endereço pode estar errado, ou a página já não está disponível.'
              : erro.message
          }
        >
          <Link className="btn btn-primary" to="/produtos">
            Ver produtos
          </Link>
        </EstadoVazio>
      </>
    );
  }
  if (!pagina) {
    return <p className="text-body-secondary">A carregar…</p>;
  }

  const {
    nomeExploracao,
    localizacao,
    descricao,
    capaUrl,
    logotipoUrl,
    levantamento,
    contactos,
    ponto,
    exemplo,
    desde,
    validacao,
    avaliacao,
  } = pagina;
  const ligacoes = ligacoesDosContactos(contactos);
  const comLateral = levantamento || ponto || ligacoes.length > 0;

  return (
    <>
      <title>{`${nomeExploracao} · Do Campo à Mesa`}</title>
      {souEu && validacao && validacao !== 'aprovado' && (
        <div className="alert alert-warning" role="status">
          Esta é uma pré-visualização: a sua página só fica pública depois de a
          conta ser aprovada.
        </div>
      )}

      <header className="produtor-topo">
        <div className="produtor-capa">
          {capaUrl && <img src={enderecoDaImagem(capaUrl)} alt="" />}
        </div>
        <div className="produtor-identidade">
          <span className="produtor-logotipo">
            {logotipoUrl ? (
              <img src={enderecoDaImagem(logotipoUrl)} alt="" />
            ) : (
              <span aria-hidden="true">{iniciais(nomeExploracao)}</span>
            )}
          </span>
          <div className="lista-produtos-texto">
            <h1 className="mb-1">
              {nomeExploracao}
              {exemplo && (
                <span className="selo selo-exemplo align-middle ms-2">
                  Exemplo
                </span>
              )}
            </h1>
            <p className="small text-body-secondary mb-0 d-flex align-items-center gap-1">
              <Icone nome="local" tamanho={18} />
              {textoDaLocalizacao(localizacao)}
            </p>
            {desde && (
              <p className="small text-body-secondary mb-0">
                No Do Campo à Mesa desde {formatarMesEAno(desde)}
              </p>
            )}
            {avaliacao?.total > 0 && (
              <Link
                className="nota-produtor"
                to={`/produtores/${id}/avaliacoes`}
              >
                <Icone nome="estrela" cheio tamanho={18} />
                <strong>{formatarMedia(avaliacao.media)}</strong>
                <span>· {textoDasAvaliacoes(avaliacao.total)}</span>
              </Link>
            )}
          </div>
        </div>
        {souEu && (
          <Link className="btn btn-suave btn-sm" to="/conta/quinta">
            Editar a página
          </Link>
        )}
      </header>

      <div className={comLateral ? 'produtor-corpo' : undefined}>
        <div className="produtor-principal">
          {descricao && (
            <section className="mb-4" aria-labelledby="historia">
              <h2 className="h5" id="historia">
                A nossa história
              </h2>
              <p className="produtor-historia">{descricao}</p>
            </section>
          )}

          {leiloes.length > 0 && <LeiloesDoProdutor leiloes={leiloes} />}

          <section aria-labelledby="produtos-do-produtor">
            <h2 className="h5" id="produtos-do-produtor">
              Produtos
            </h2>
            {produtos.length === 0 ? (
              <p className="text-body-secondary">Ainda não há produtos.</p>
            ) : (
              <div className="row row-cols-2 row-cols-md-3 g-3">
                {produtos.map((produto) => (
                  <div className="col" key={produto.id}>
                    <CartaoProduto produto={produto} nivel="h3" />
                  </div>
                ))}
              </div>
            )}
          </section>

          <NotaGeral avaliacao={avaliacao} produtorId={id} />
        </div>

        {comLateral && (
          <aside className="produtor-lateral">
            {levantamento && (
              <section className="card mb-3" aria-labelledby="levantamento">
                <div className="card-body">
                  <h2
                    className="h6 d-flex align-items-center gap-2"
                    id="levantamento"
                  >
                    <Icone nome="relogio" tamanho={20} />
                    Levantamento na quinta
                  </h2>
                  <HorarioLevantamento levantamento={levantamento} />
                  {levantamento.nota && (
                    <p className="small text-body-secondary mb-0 mt-2">
                      {levantamento.nota}
                    </p>
                  )}
                </div>
              </section>
            )}

            {ligacoes.length > 0 && (
              <section className="card mb-3" aria-labelledby="contactos">
                <div className="card-body">
                  <h2 className="h6" id="contactos">
                    Contactos
                  </h2>
                  <ul className="list-unstyled mb-0 d-grid gap-2">
                    {ligacoes.map(({ icone, texto, endereco }) => (
                      <li key={endereco}>
                        <a
                          className="d-inline-flex align-items-center gap-2"
                          href={endereco}
                          target={
                            endereco.startsWith('http') ? '_blank' : undefined
                          }
                          rel="noopener noreferrer"
                        >
                          <Icone nome={icone} tamanho={20} />
                          {texto}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {ponto && (
              <section aria-labelledby="onde-estamos">
                <h2 className="h6" id="onde-estamos">
                  Onde estamos
                </h2>
                <div className="mapa-moldura">
                  <MapaQuinta
                    ponto={ponto}
                    rotulo={`Mapa com a localização de ${nomeExploracao}`}
                  />
                  <a
                    className="mapa-abrir"
                    href={enderecoNoMaps(ponto, nomeExploracao)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir no Maps
                    <Icone nome="abrirFora" tamanho={16} />
                  </a>
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

// Os leilões do produtor, a decorrer e marcados. Só esta parte é que se volta a desenhar com o
// relógio (para a contagem), e não a página toda.
function LeiloesDoProdutor({ leiloes }) {
  const agora = useAgora();
  return (
    <section className="mb-4" aria-labelledby="leiloes-do-produtor">
      <h2 className="h5" id="leiloes-do-produtor">
        Leilões
      </h2>
      <ul className="list-group">
        {leiloes.map((leilao) => {
          const fase = faseDoLeilao(leilao, agora);
          return (
            <li className="list-group-item" key={leilao.id}>
              <Link className="agenda-leilao" to={`/leiloes/${leilao.id}`}>
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
                  <span className="d-block small text-body-secondary">
                    {fase === 'ativo'
                      ? `Termina em ${formatarTempo(new Date(leilao.terminaEm) - agora)}`
                      : `${formatarDia(leilao.iniciaEm)} às ${formatarHora(leilao.iniciaEm)}`}
                  </span>
                </span>
                {fase === 'ativo' && (
                  <span className="selo selo-direto">Em direto</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// O resumo das avaliações (a média e as barras), com o botão para as ler. As avaliações em si só
// aparecem na página delas.
function NotaGeral({ avaliacao, produtorId }) {
  const total = avaliacao?.total ?? 0;
  const ligacao = `/produtores/${produtorId}/avaliacoes`;
  return (
    <section className="mt-4" aria-labelledby="avaliacoes-do-produtor">
      <h2 className="h5" id="avaliacoes-do-produtor">
        Avaliações
      </h2>
      {total === 0 ? (
        <p className="text-body-secondary">Ainda não há avaliações.</p>
      ) : (
        <ResumoDasAvaliacoes resumo={avaliacao} ligacao={ligacao}>
          <Link className="btn btn-suave" to={ligacao}>
            {total === 1 ? 'Ler a avaliação' : `Ler as ${total} avaliações`}
          </Link>
        </ResumoDasAvaliacoes>
      )}
    </section>
  );
}
