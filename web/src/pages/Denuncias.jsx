import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import CasoDeProdutor from '../components/CasoDeProdutor.jsx';
import Campo from '../components/Campo.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import Estrelas from '../components/Estrelas.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';
import { formatarDia } from '../avaliacoes.js';
import {
  fraseDoMotivo,
  nomeDoMotivo,
  textoDasDenuncias,
} from '../denuncias.js';

// O endereço da lista na API, para o tipo, a vista e a página
function enderecoDaLista(tipo, decididas, pagina = 1) {
  const parametros = new URLSearchParams();
  if (tipo === 'produtor') {
    parametros.set('tipo', 'produtor');
  }
  if (decididas) {
    parametros.set('estado', 'decidida');
  }
  if (pagina > 1) {
    parametros.set('pagina', pagina);
  }
  const texto = parametros.toString();
  return `/admin/denuncias${texto ? `?${texto}` : ''}`;
}

// Página do administrador (/admin/denuncias): as avaliações ou os produtores denunciados, cada um
// uma só vez, com as denúncias que teve. Por decidir (primeiro os que esperam há mais tempo) ou já
// decididos, para se poder voltar atrás (numa avaliação) ou levantar o castigo (num produtor). O tipo
// e a vista ficam no endereço (?tipo=produtor&ver=decididas).
export default function Denuncias() {
  const { pedir } = useSessao();
  const { denunciasDeAvaliacoes, denunciasDeProdutores, recontar } =
    useTarefasAdmin();
  const [procura, setProcura] = useSearchParams();
  const tipo = procura.get('tipo') === 'produtor' ? 'produtor' : 'avaliacao';
  const decididas = procura.get('ver') === 'decididas';
  const porDecidirDoTipo =
    tipo === 'produtor' ? denunciasDeProdutores : denunciasDeAvaliacoes;
  // null quer dizer que a lista ainda não chegou
  const [casos, setCasos] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState('');
  // Muda para voltar a ler a lista (uma denúncia nova, ou a decisão de outro administrador)
  const [versao, setVersao] = useState(0);
  useEventoSocket('denuncias-mudaram', () => setVersao((n) => n + 1));

  useEffect(() => {
    let cancelado = false;
    pedir(enderecoDaLista(tipo, decididas))
      .then((dados) => {
        if (!cancelado) {
          setCasos(dados.casos);
          setTemMais(dados.temMais);
          setPagina(1);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, tipo, decididas, versao]);

  // Muda o tipo ou a vista, no endereço
  function ver(novoTipo, paraDecididas) {
    if (novoTipo !== tipo || paraDecididas !== decididas) {
      setCasos(null);
      setMensagem('');
      setProcura(
        {
          ...(novoTipo === 'produtor' ? { tipo: 'produtor' } : {}),
          ...(paraDecididas ? { ver: 'decididas' } : {}),
        },
        { replace: true },
      );
    }
  }

  async function carregarMais() {
    try {
      const dados = await pedir(enderecoDaLista(tipo, decididas, pagina + 1));
      setCasos((atuais) => [...atuais, ...dados.casos]);
      setTemMais(dados.temMais);
      setPagina((n) => n + 1);
    } catch (problema) {
      setErro(problema);
    }
  }

  // Depois de uma decisão: por decidir, o caso sai da lista; nas decididas, fica com a decisão nova.
  // A mensagem diz quem recebeu a decisão: quem denunciou só a recebe da primeira vez.
  function decidido(caso, eraPorDecidir) {
    const { id } = caso.avaliacao;
    setCasos((atuais) =>
      decididas
        ? atuais.map((c) => (c.avaliacao.id === id ? caso : c))
        : atuais.filter((c) => c.avaliacao.id !== id),
    );
    const { visivel } = caso.avaliacao;
    let texto;
    if (eraPorDecidir) {
      texto = visivel
        ? 'A avaliação fica visível. Quem a denunciou recebeu a decisão.'
        : 'A avaliação foi ocultada. Quem a escreveu e quem a denunciou receberam a decisão.';
    } else {
      texto = visivel
        ? 'A avaliação voltou a aparecer. Quem a escreveu foi avisado.'
        : 'A avaliação foi ocultada. Quem a escreveu foi avisado.';
    }
    setMensagem(texto);
    recontar();
  }

  // Depois de decidir um produtor: o caso sai da lista do que está por decidir
  function produtorDecidido(caso, decisao) {
    setCasos((atuais) =>
      atuais.filter((c) => c.produtor.id !== caso.produtor.id),
    );
    const mensagens = {
      rejeitada: 'A denúncia foi rejeitada. Quem denunciou recebeu o motivo.',
      aviso: 'O produtor recebeu o aviso. Quem denunciou foi informado.',
      suspensao:
        'O produtor está suspenso: os produtos e a página saíram da loja e os leilões dele foram cancelados. Ele e quem denunciou foram avisados.',
    };
    setMensagem(mensagens[decisao]);
    recontar();
  }

  // Depois de levantar a suspensão: o caso fica, sem o castigo
  function castigoLevantado(id) {
    setCasos((atuais) =>
      atuais.map((c) =>
        c.produtor.id === id
          ? { ...c, produtor: { ...c.produtor, castigo: null } }
          : c,
      ),
    );
    setMensagem(
      'A suspensão foi levantada: os produtos e a página voltaram à loja, e o produtor foi avisado.',
    );
  }

  return (
    <>
      <title>Denúncias · Do Campo à Mesa</title>
      <h1 className="mb-3">Denúncias</h1>

      <nav
        className="alternador alternador-denuncias"
        aria-label="Tipo de denúncia"
      >
        <Link
          className={tipo === 'avaliacao' ? 'active' : undefined}
          aria-current={tipo === 'avaliacao' ? 'page' : undefined}
          to={decididas ? '?ver=decididas' : '.'}
          replace
          onClick={(evento) => {
            evento.preventDefault();
            ver('avaliacao', decididas);
          }}
        >
          <span>
            Avaliações
            {denunciasDeAvaliacoes > 0 && (
              <span className="contador ms-2">{denunciasDeAvaliacoes}</span>
            )}
          </span>
        </Link>
        <Link
          className={tipo === 'produtor' ? 'active' : undefined}
          aria-current={tipo === 'produtor' ? 'page' : undefined}
          to={`?tipo=produtor${decididas ? '&ver=decididas' : ''}`}
          replace
          onClick={(evento) => {
            evento.preventDefault();
            ver('produtor', decididas);
          }}
        >
          <span>
            Produtores
            {denunciasDeProdutores > 0 && (
              <span className="contador ms-2">{denunciasDeProdutores}</span>
            )}
          </span>
        </Link>
      </nav>

      <ul className="nav nav-pills gap-2 mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${decididas ? '' : 'active'}`}
            type="button"
            aria-pressed={!decididas}
            onClick={() => ver(tipo, false)}
          >
            Por decidir
            {porDecidirDoTipo > 0 && (
              <span className="contador ms-2">{porDecidirDoTipo}</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${decididas ? 'active' : ''}`}
            type="button"
            aria-pressed={decididas}
            onClick={() => ver(tipo, true)}
          >
            Decididas
          </button>
        </li>
      </ul>

      <AlertaDeErro erro={erro} />
      {/* O role="status" faz os leitores de ecrã anunciarem o resultado de cada decisão */}
      <p className="text-body-secondary" role="status">
        {mensagem || (casos === null && !erro && 'A carregar…')}
      </p>

      {casos?.length === 0 && <SemCasos tipo={tipo} decididas={decididas} />}

      {casos?.length > 0 && (
        <div className="d-grid gap-3">
          {casos.map((caso) =>
            tipo === 'produtor' ? (
              <CasoDeProdutor
                key={caso.produtor.id}
                caso={caso}
                aoDecidir={produtorDecidido}
                aoLevantar={castigoLevantado}
              />
            ) : (
              <CasoDeDenuncia
                key={caso.avaliacao.id}
                caso={caso}
                aoDecidir={decidido}
              />
            ),
          )}
        </div>
      )}
      {temMais && (
        <button
          className="btn btn-suave w-100 mt-3"
          type="button"
          onClick={carregarMais}
        >
          Carregar mais
        </button>
      )}
    </>
  );
}

// A mensagem de quando a lista está vazia, para cada tipo e vista
function SemCasos({ tipo, decididas }) {
  const textos = {
    avaliacao: decididas
      ? [
          'Ainda não há decisões',
          'As avaliações já decididas ficam aqui, para poder voltar atrás.',
        ]
      : [
          'Não há denúncias por decidir',
          'Quando alguém denunciar uma avaliação, ela aparece aqui para decidir se fica ou sai.',
        ],
    produtor: decididas
      ? [
          'Ainda não há decisões',
          'Os produtores já decididos ficam aqui, com o castigo em vigor, para o poder levantar mais cedo.',
        ]
      : [
          'Não há denúncias por decidir',
          'Quando alguém denunciar um produtor, ele aparece aqui para decidir: rejeitar, dar um aviso ou suspender.',
        ],
  };
  const [titulo, texto] = textos[tipo];
  return <EstadoVazio icone="denuncia" titulo={titulo} texto={texto} />;
}

const SELOS = {
  porDecidir: { classe: 'selo-por-decidir', nome: 'Por decidir' },
  mantida: { classe: 'selo-mantida', nome: 'Mantida' },
  ocultada: { classe: 'selo-ocultada', nome: 'Ocultada' },
};

// O motivo que mais vezes aparece nas denúncias, para sugerir o texto de quando se oculta (o
// administrador pode mudá-lo antes de confirmar)
function sugestaoParaOcultar(denuncias) {
  const contagem = {};
  for (const { motivo } of denuncias) {
    contagem[motivo] = (contagem[motivo] ?? 0) + 1;
  }
  const [maisComum] = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return maisComum ? fraseDoMotivo(maisComum[0]) : '';
}

// Uma avaliação denunciada: a avaliação toda, as denúncias (com quem as fez) e a decisão
function CasoDeDenuncia({ caso, aoDecidir }) {
  const { avaliacao, denuncias } = caso;
  const { autor, produtor, moderacao, resposta } = avaliacao;
  const porDecidir = denuncias.some(({ estado }) => estado === 'pendente');
  const selo = porDecidir ? SELOS.porDecidir : SELOS[moderacao?.decisao];
  // A decisão que se está a tomar ('mantida' ou 'ocultada'), com o formulário do motivo aberto
  const [aDecidir, setADecidir] = useState(null);

  // Por decidir: manter ou ocultar. Já decidida: só a decisão contrária, para voltar atrás.
  const acoes = porDecidir
    ? ['mantida', 'ocultada']
    : [avaliacao.visivel ? 'ocultada' : 'mantida'];

  return (
    <article className="card caso-denuncia">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-baseline gap-2 mb-2">
          <h2 className="h6 mb-0 me-auto">
            Avaliação a{' '}
            <Link to={`/produtores/${produtor.id}/avaliacoes`}>
              {produtor.nomeExploracao}
            </Link>
          </h2>
          {selo && <span className={`selo ${selo.classe}`}>{selo.nome}</span>}
        </div>

        <div className="caso-avaliacao">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <Estrelas valor={avaliacao.classificacao} tamanho={16} />
            <span className="fw-bold">{autor.nome}</span>
            <span className="small text-body-secondary">
              {formatarDia(avaliacao.data)}
              {avaliacao.editadaEm && ' · editada'}
            </span>
          </div>
          {avaliacao.comentario ? (
            <p className="avaliacao-comentario mb-0">{avaliacao.comentario}</p>
          ) : (
            <p className="small text-body-secondary mb-0">Sem comentário.</p>
          )}
          {resposta && (
            <div className="resposta-produtor">
              <p className="small fw-bold mb-1">
                Resposta de {produtor.nomeExploracao}
              </p>
              <p className="resposta-produtor-texto mb-0">{resposta.texto}</p>
            </div>
          )}
        </div>

        <h3 className="h6 mt-3 mb-2">{textoDasDenuncias(denuncias.length)}</h3>
        <ul className="lista-denuncias">
          {denuncias.map((denuncia) => (
            <li key={denuncia.id}>
              <p className="fw-semibold mb-0">
                {nomeDoMotivo(denuncia.motivo)}
              </p>
              {denuncia.descricao && (
                <p className="mb-0 text-break">{denuncia.descricao}</p>
              )}
              <p className="small text-body-secondary mb-0">
                {denuncia.autor.nome}
                {denuncia.autor.eOProdutor && ' (o produtor avaliado)'} ·{' '}
                {formatarDia(denuncia.data)}
              </p>
            </li>
          ))}
        </ul>

        {moderacao && (
          <p className="caso-decisao">
            <strong>
              {porDecidir ? 'Decisão anterior' : 'Decisão'}:{' '}
              {moderacao.decisao === 'ocultada' ? 'ocultada' : 'mantida'}
            </strong>{' '}
            a {formatarDia(moderacao.data)}. {moderacao.motivo}
          </p>
        )}

        {aDecidir ? (
          <FormularioDaDecisao
            caso={caso}
            decisao={aDecidir}
            textoInicial={
              aDecidir === 'ocultada'
                ? sugestaoParaOcultar(denuncias)
                : porDecidir
                  ? 'Não infringe as regras: é a opinião de quem fez a encomenda.'
                  : ''
            }
            aoDecidir={(decidido) => aoDecidir(decidido, porDecidir)}
            aoCancelar={() => setADecidir(null)}
          />
        ) : (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {acoes.map((decisao) => (
              <button
                key={decisao}
                className={`btn btn-sm ${decisao === 'ocultada' ? 'btn-suave-perigo' : 'btn-suave'}`}
                type="button"
                onClick={() => setADecidir(decisao)}
              >
                {nomeDaAcao(decisao, porDecidir)}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function nomeDaAcao(decisao, porDecidir) {
  if (decisao === 'ocultada') {
    return 'Ocultar';
  }
  return porDecidir ? 'Manter' : 'Voltar a mostrar';
}

// A quem chega o motivo: quem denunciou só recebe a primeira decisão, e quem escreveu a avaliação só
// é avisado quando ela é ocultada ou volta a aparecer
function textoDaAjuda(decisao, porDecidir) {
  if (!porDecidir) {
    return 'É enviado a quem escreveu a avaliação.';
  }
  return decisao === 'ocultada'
    ? 'É enviado a quem escreveu a avaliação e a quem a denunciou.'
    : 'É enviado a quem denunciou.';
}

// O motivo da decisão, que segue na notificação
function FormularioDaDecisao({
  caso,
  decisao,
  textoInicial,
  aoDecidir,
  aoCancelar,
}) {
  const { pedir } = useSessao();
  const porDecidir = caso.denuncias.some(({ estado }) => estado === 'pendente');
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    motivo: textoInicial,
  });

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      const decidido = await pedir(
        `/admin/avaliacoes/${caso.avaliacao.id}/moderacao`,
        { metodo: 'PATCH', corpo: { decisao, motivo: valores.motivo } },
      );
      aoDecidir(decidido);
    });
  }

  return (
    <form className="mt-3" ref={formulario} onSubmit={submeter} noValidate>
      <Campo
        rotulo="Motivo da decisão"
        nome="motivo"
        tipo="textarea"
        rows={2}
        maxLength={500}
        autoFocus
        ajuda={textoDaAjuda(decisao, porDecidir)}
        value={valores.motivo}
        onChange={mudar}
        erro={erro?.detalhes?.motivo}
      />
      {!erro?.detalhes?.motivo && <AlertaDeErro erro={erro} />}
      <div className="d-flex flex-wrap gap-2">
        <button
          className={`btn btn-sm ${decisao === 'ocultada' ? 'btn-danger' : 'btn-primary'}`}
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar
            ? 'A guardar…'
            : `${nomeDaAcao(decisao, porDecidir)} a avaliação`}
        </button>
        <button
          className="btn btn-suave btn-sm"
          type="button"
          onClick={aoCancelar}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
