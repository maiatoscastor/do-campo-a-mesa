import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../api/cliente.js';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Estrelas from '../components/Estrelas.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import FormularioDaDenuncia from '../components/FormularioDaDenuncia.jsx';
import Icone from '../components/Icone.jsx';
import RespostaDoProdutor from '../components/RespostaDoProdutor.jsx';
import ResumoDasAvaliacoes from '../components/ResumoDasAvaliacoes.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarDia, textoDasEstrelas } from '../avaliacoes.js';
import { MOTIVOS_DE_DENUNCIA } from '../denuncias.js';

// As avaliações de um produtor (/produtores/:id/avaliacoes): o resumo com a distribuição das
// estrelas (tocar numa barra mostra só essas) e a lista, das mais recentes para as mais antigas, com
// as respostas. O produtor responde aqui; quem avaliou tem a ligação para mudar a avaliação; e quem
// tem sessão pode denunciar uma avaliação.
export default function AvaliacoesProdutor() {
  const { id } = useParams();
  const { utilizador, pedir } = useSessao();
  const souEu = utilizador?.id === id;
  const [procura, setProcura] = useSearchParams();
  const estrelas = Number(procura.get('estrelas')) || null;
  const [produtor, setProdutor] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState(null);
  // Muda para voltar a ler tudo (por exemplo, quando chega uma avaliação nova)
  const [versao, setVersao] = useState(0);

  // O nome do produtor, para o título
  useEffect(() => {
    let cancelado = false;
    (souEu ? pedir('/producers/eu') : api(`/producers/${id}`))
      .then((dados) => !cancelado && setProdutor(dados))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [id, souEu, pedir]);

  // A primeira página, sempre que muda o filtro
  // A lista pede-se com a sessão (quando há), para cada avaliação dizer se a pessoa já a denunciou
  useEffect(() => {
    let cancelado = false;
    pedir(`/reviews?produtor=${id}${estrelas ? `&estrelas=${estrelas}` : ''}`)
      .then((dados) => {
        if (!cancelado) {
          setResumo(dados.resumo);
          setAvaliacoes(dados.avaliacoes);
          setTemMais(dados.temMais);
          setPagina(1);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [id, estrelas, versao, pedir]);

  const recarregar = () => setVersao((n) => n + 1);
  // O produtor vê as avaliações novas a chegar; quem avaliou, a resposta
  useEventoSocket('nova-avaliacao', recarregar);
  useEventoSocket('resposta-avaliacao', recarregar);
  // Quem escreveu uma avaliação que o administrador ocultou vê-a sair da lista
  useEventoSocket('avaliacao-moderada', recarregar);

  async function carregarMais() {
    try {
      const dados = await pedir(
        `/reviews?produtor=${id}${estrelas ? `&estrelas=${estrelas}` : ''}&pagina=${pagina + 1}`,
      );
      setAvaliacoes((atuais) => [...atuais, ...dados.avaliacoes]);
      setTemMais(dados.temMais);
      setPagina((n) => n + 1);
    } catch (problema) {
      setErro(problema);
    }
  }

  function filtrar(numero) {
    setProcura(
      numero && numero !== estrelas ? { estrelas: String(numero) } : {},
      { replace: true },
    );
  }

  // Muda uma avaliação da lista (por exemplo, depois de o produtor responder)
  function trocar(mudada) {
    setAvaliacoes((atuais) =>
      atuais.map((avaliacao) =>
        avaliacao.id === mudada.id ? mudada : avaliacao,
      ),
    );
  }

  if (erro && !produtor) {
    return (
      <>
        <title>Avaliações · Do Campo à Mesa</title>
        <EstadoVazio
          icone="estrela"
          titulo="Produtor não encontrado"
          texto="O endereço pode estar errado, ou a página já não está disponível."
        >
          <Link className="btn btn-primary" to="/produtos">
            Ver produtos
          </Link>
        </EstadoVazio>
      </>
    );
  }
  if (!produtor || !resumo) {
    return <p className="text-body-secondary">A carregar…</p>;
  }

  return (
    <>
      <title>{`Avaliações de ${produtor.nomeExploracao} · Do Campo à Mesa`}</title>
      <Link
        className="d-inline-flex align-items-center gap-1 mb-2"
        to={`/produtores/${id}`}
      >
        <Icone nome="voltar" tamanho={18} />
        {produtor.nomeExploracao}
      </Link>
      <h1 className="mb-3">Avaliações</h1>
      <AlertaDeErro erro={erro} />

      {resumo.total === 0 ? (
        <EstadoVazio
          icone="estrela"
          titulo="Ainda não há avaliações"
          texto="As avaliações aparecem aqui depois das primeiras encomendas entregues."
        />
      ) : (
        <div className="avaliacoes-pagina">
          <ResumoDasAvaliacoes
            resumo={resumo}
            estrelas={estrelas}
            filtrar={filtrar}
          />
          <section aria-label="Lista das avaliações">
            {estrelas && (
              <p className="d-flex flex-wrap align-items-center gap-2 mb-3">
                A mostrar só as de {textoDasEstrelas(estrelas)}.
                <button
                  className="btn btn-link btn-sm p-0"
                  type="button"
                  onClick={() => filtrar(null)}
                >
                  Ver todas
                </button>
              </p>
            )}
            {avaliacoes.length === 0 && (
              <p className="text-body-secondary">
                Não há avaliações com {textoDasEstrelas(estrelas)}.
              </p>
            )}
            <ul className="lista-avaliacoes">
              {avaliacoes.map((avaliacao) => (
                <li key={avaliacao.id}>
                  <Avaliacao
                    avaliacao={avaliacao}
                    produtor={produtor}
                    souOProdutor={souEu}
                    souOAutor={avaliacao.autor.id === utilizador?.id}
                    // Quem tem sessão denuncia as dos outros; o administrador decide, não denuncia
                    podeDenunciar={
                      utilizador &&
                      utilizador.papel !== 'admin' &&
                      avaliacao.autor.id !== utilizador.id
                    }
                    aoMudar={trocar}
                  />
                </li>
              ))}
            </ul>
            {temMais && (
              <button
                className="btn btn-suave w-100"
                type="button"
                onClick={carregarMais}
              >
                Carregar mais
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
}

// Uma avaliação: as estrelas, quem a escreveu e quando, o comentário, as estrelas dos produtos e a
// resposta do produtor. Ao lado da data, discreto, o "Denunciar" (ou "Denunciada", depois).
function Avaliacao({
  avaliacao,
  produtor,
  souOProdutor,
  souOAutor,
  podeDenunciar,
  aoMudar,
}) {
  const { classificacao, comentario, produtos, autor, data, editadaEm } =
    avaliacao;
  const [aDenunciar, setADenunciar] = useState(false);
  const [acabouDeDenunciar, setAcabouDeDenunciar] = useState(false);

  return (
    <article className="avaliacao">
      {/* À esquerda, as estrelas, o nome e a data (que passam para baixo quando não cabem); à
          direita, sempre na primeira linha, o "Denunciar" */}
      <div className="avaliacao-topo">
        <div className="d-flex flex-wrap align-items-center column-gap-2">
          <Estrelas valor={classificacao} tamanho={18} />
          <span className="fw-bold">{autor.nome}</span>
          <span className="small text-body-secondary">
            {formatarDia(data)}
            {editadaEm && ' · editada'}
          </span>
        </div>
        {podeDenunciar && avaliacao.denunciada && (
          <span className="denunciada">
            <Icone nome="denuncia" tamanho={16} />
            Denunciada
          </span>
        )}
        {podeDenunciar && !avaliacao.denunciada && !aDenunciar && (
          <button
            className="btn btn-link btn-sm denunciar"
            type="button"
            onClick={() => setADenunciar(true)}
          >
            <Icone nome="denuncia" tamanho={16} />
            Denunciar
          </button>
        )}
      </div>
      {comentario && <p className="avaliacao-comentario">{comentario}</p>}
      {produtos.length > 0 && (
        <ul className="avaliacao-produtos">
          {produtos.map(({ produto, nome, classificacao: nota }) => (
            <li key={produto}>
              {nome}
              <span className="avaliacao-produto-nota">
                <Icone nome="estrela" cheio tamanho={14} />
                {nota}
                <span className="visually-hidden">
                  {nota === 1 ? ' estrela' : ' estrelas'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {souOAutor && (
        <Link
          className="btn btn-link btn-sm p-0"
          to={`/encomendas/${avaliacao.encomenda}/avaliar`}
        >
          Mudar a minha avaliação
        </Link>
      )}
      <RespostaDoProdutor
        avaliacao={avaliacao}
        nomeDoProdutor={produtor.nomeExploracao}
        podeResponder={souOProdutor}
        aoMudar={aoMudar}
      />
      {aDenunciar && (
        <FormularioDaDenuncia
          caminho={`/reviews/${avaliacao.id}/denuncias`}
          pergunta="Porque quer denunciar esta avaliação?"
          motivos={MOTIVOS_DE_DENUNCIA}
          aoEnviar={() => {
            setADenunciar(false);
            setAcabouDeDenunciar(true);
            aoMudar({ ...avaliacao, denunciada: true });
          }}
          aoCancelar={() => setADenunciar(false)}
        />
      )}
      <p className="small text-body-secondary mb-0" role="status">
        {acabouDeDenunciar &&
          'Obrigado. O administrador vai analisar a denúncia.'}
      </p>
    </article>
  );
}
