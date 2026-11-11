import { useId, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from './AlertaDeErro.jsx';
import Campo from './Campo.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarDia } from '../avaliacoes.js';
import {
  fraseDoMotivo,
  nomeDoMotivo,
  textoDasDenuncias,
} from '../denuncias.js';
import { formatarData } from '../encomendas.js';

const DIA = 24 * 60 * 60 * 1000;

// As três decisões sobre um produtor denunciado: o nome do botão, o selo e a frase de ajuda (a quem
// chega o motivo)
const DECISOES = {
  rejeitada: {
    acao: 'Rejeitar',
    confirmar: 'Rejeitar a denúncia',
    nome: 'Rejeitada',
    selo: 'selo-rejeitada',
    botao: 'btn-suave',
    ajuda: 'É enviado a quem denunciou. O produtor não é avisado.',
    sugestao: 'Não encontrámos motivo para agir.',
  },
  aviso: {
    acao: 'Dar um aviso',
    confirmar: 'Dar o aviso',
    nome: 'Aviso',
    selo: 'selo-aviso',
    botao: 'btn-suave',
    ajuda:
      'É enviado ao produtor. Quem denunciou só sabe que foram tomadas medidas.',
  },
  suspensao: {
    acao: 'Suspender',
    confirmar: 'Suspender',
    nome: 'Suspensão',
    selo: 'selo-suspenso',
    botao: 'btn-suave-perigo',
    ajuda:
      'É enviado ao produtor. Os produtos e a página saem da loja até à data, e os leilões dele que ainda não acabaram são cancelados.',
  },
};

// As durações da suspensão: em dias, ou até uma data escolhida
const DURACOES = [
  { valor: '7', nome: '7 dias' },
  { valor: '30', nome: '30 dias' },
  { valor: '90', nome: '90 dias' },
  { valor: 'data', nome: 'Até uma data' },
];

// O motivo que mais vezes aparece nas denúncias, como sugestão para o motivo da decisão
function motivoMaisComum(denuncias) {
  const contagem = {};
  for (const { motivo } of denuncias) {
    contagem[motivo] = (contagem[motivo] ?? 0) + 1;
  }
  const [maisComum] = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return maisComum ? fraseDoMotivo(maisComum[0]) : '';
}

// "1 aviso e 2 suspensões antes", ou nada se não teve nenhum
function textoDoHistorico({ avisos, suspensoes }) {
  const partes = [];
  if (avisos > 0) {
    partes.push(avisos === 1 ? '1 aviso' : `${avisos} avisos`);
  }
  if (suspensoes > 0) {
    partes.push(suspensoes === 1 ? '1 suspensão' : `${suspensoes} suspensões`);
  }
  return partes.length > 0 ? `Já teve ${partes.join(' e ')}` : '';
}

// Um produtor denunciado, na página das denúncias da administração: quem é, o castigo em vigor (com
// o botão para o levantar), o que já teve, as denúncias (com quem as fez) e, se estiver por decidir,
// as três decisões
export default function CasoDeProdutor({ caso, aoDecidir, aoLevantar }) {
  const { produtor, historico, denuncias } = caso;
  const porDecidir = denuncias.some(({ estado }) => estado === 'pendente');
  // A decisão mais recente, nos casos já decididos
  const ultima = porDecidir
    ? null
    : denuncias
        .filter(({ decididaEm }) => decididaEm)
        .sort((a, b) => new Date(b.decididaEm) - new Date(a.decididaEm))[0];
  const [aDecidir, setADecidir] = useState(null);
  const passado = textoDoHistorico(historico);

  let selo = null;
  if (porDecidir) {
    selo = { classe: 'selo-por-decidir', nome: 'Por decidir' };
  } else if (produtor.castigo) {
    selo = { classe: 'selo-suspenso', nome: 'Suspenso' };
  } else if (ultima) {
    selo = {
      classe: DECISOES[ultima.decisao].selo,
      nome: DECISOES[ultima.decisao].nome,
    };
  }

  return (
    <article className="card caso-denuncia">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-baseline gap-2 mb-1">
          <h2 className="h6 mb-0 me-auto">
            Produtor{' '}
            <Link to={`/produtores/${produtor.id}`}>
              {produtor.nomeExploracao}
            </Link>
          </h2>
          {selo && <span className={`selo ${selo.classe}`}>{selo.nome}</span>}
        </div>
        <p className="small text-body-secondary mb-0">
          {produtor.nome}
          {produtor.localizacao?.nomeConcelho &&
            ` · ${produtor.localizacao.nomeConcelho}`}
          {passado && ` · ${passado}`}
        </p>

        {produtor.castigo && (
          <Castigo
            produtor={produtor}
            aoLevantar={() => aoLevantar(produtor.id)}
          />
        )}

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
                {denuncia.autor.nome} · {formatarDia(denuncia.data)}
              </p>
            </li>
          ))}
        </ul>

        {ultima && (
          <p className="caso-decisao">
            <strong>
              Decisão: {DECISOES[ultima.decisao].nome.toLowerCase()}
            </strong>{' '}
            a {formatarDia(ultima.decididaEm)}. {ultima.motivoDaDecisao}
          </p>
        )}

        {porDecidir &&
          (aDecidir ? (
            <FormularioDaDecisao
              produtor={produtor}
              decisao={aDecidir}
              textoInicial={
                DECISOES[aDecidir].sugestao ?? motivoMaisComum(denuncias)
              }
              aoDecidir={aoDecidir}
              aoCancelar={() => setADecidir(null)}
            />
          ) : (
            <div className="d-flex flex-wrap gap-2 mt-3">
              {Object.entries(DECISOES).map(([decisao, { acao, botao }]) => (
                <button
                  key={decisao}
                  className={`btn btn-sm ${botao}`}
                  type="button"
                  onClick={() => setADecidir(decisao)}
                >
                  {acao}
                </button>
              ))}
            </div>
          ))}
      </div>
    </article>
  );
}

// O castigo em vigor e o botão para o levantar mais cedo (com confirmação, porque devolve logo os
// produtos à loja)
function Castigo({ produtor, aoLevantar }) {
  const { pedir } = useSessao();
  const [aConfirmar, setAConfirmar] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState(null);
  const { castigo } = produtor;

  async function levantar() {
    setAEnviar(true);
    setErro(null);
    try {
      await pedir(`/admin/produtores/${produtor.id}/castigo`, {
        metodo: 'DELETE',
      });
      aoLevantar();
    } catch (problema) {
      setErro(problema);
      setAEnviar(false);
    }
  }

  return (
    <div className="caso-castigo">
      <p className="mb-2">
        <strong>Suspenso até {formatarData(castigo.ate)}.</strong> Motivo:{' '}
        {castigo.motivo}
      </p>
      <AlertaDeErro erro={erro} />
      {aConfirmar ? (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span className="small">Os produtos voltam logo à loja.</span>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            disabled={aEnviar}
            onClick={levantar}
          >
            {aEnviar ? 'A levantar…' : 'Levantar a suspensão'}
          </button>
          <button
            className="btn btn-suave btn-sm"
            type="button"
            onClick={() => setAConfirmar(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          className="btn btn-suave btn-sm"
          type="button"
          onClick={() => setAConfirmar(true)}
        >
          Levantar mais cedo
        </button>
      )}
    </div>
  );
}

// A data de fim da suspensão: daqui a N dias, ou o fim do dia escolhido (na hora do dispositivo)
function dataDeFim(duracao, data) {
  if (duracao === 'data') {
    return data ? new Date(`${data}T23:59:59`).toISOString() : undefined;
  }
  return new Date(Date.now() + Number(duracao) * DIA).toISOString();
}

// "2026-11-12", para os limites do campo da data
function diaIso(data) {
  const doisDigitos = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

// A decisão, com o motivo (que segue na notificação) e, na suspensão, a duração
function FormularioDaDecisao({
  produtor,
  decisao,
  textoInicial,
  aoDecidir,
  aoCancelar,
}) {
  const { pedir } = useSessao();
  const id = useId();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    motivo: textoInicial,
    duracao: '7',
    data: '',
  });
  const detalhes = erro?.detalhes ?? {};
  const suspensao = decisao === 'suspensao';
  // Os limites do campo da data (de amanhã a daqui a um ano), calculados uma vez, ao abrir
  const [limites] = useState(() => ({
    min: diaIso(new Date(Date.now() + DIA)),
    max: diaIso(new Date(Date.now() + 365 * DIA)),
  }));

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      const decidido = await pedir(
        `/admin/produtores/${produtor.id}/moderacao`,
        {
          metodo: 'PATCH',
          corpo: {
            decisao,
            motivo: valores.motivo,
            ...(suspensao
              ? { ate: dataDeFim(valores.duracao, valores.data) }
              : {}),
          },
        },
      );
      aoDecidir(decidido, decisao);
    });
  }

  return (
    <form className="mt-3" ref={formulario} onSubmit={submeter} noValidate>
      {suspensao && (
        <fieldset
          className="mb-3"
          aria-describedby={detalhes.ate ? `${id}-erro` : undefined}
        >
          <legend className="form-label">Suspender durante</legend>
          <div className="d-flex flex-wrap column-gap-3">
            {DURACOES.map(({ valor, nome }) => (
              <div className="form-check" key={valor}>
                <input
                  className={`form-check-input ${detalhes.ate ? 'is-invalid' : ''}`}
                  type="radio"
                  name="duracao"
                  id={`${id}-${valor}`}
                  value={valor}
                  checked={valores.duracao === valor}
                  onChange={mudar}
                />
                <label className="form-check-label" htmlFor={`${id}-${valor}`}>
                  {nome}
                </label>
              </div>
            ))}
          </div>
          {valores.duracao === 'data' && (
            <Campo
              rotulo="Até ao fim do dia"
              nome="data"
              tipo="date"
              min={limites.min}
              max={limites.max}
              value={valores.data}
              onChange={mudar}
            />
          )}
          {detalhes.ate && (
            <div id={`${id}-erro`} className="invalid-feedback d-block">
              {detalhes.ate}
            </div>
          )}
        </fieldset>
      )}
      <Campo
        rotulo="Motivo da decisão"
        nome="motivo"
        tipo="textarea"
        rows={2}
        maxLength={500}
        autoFocus={!suspensao}
        ajuda={DECISOES[decisao].ajuda}
        value={valores.motivo}
        onChange={mudar}
        erro={detalhes.motivo}
      />
      {!erro?.detalhes && <AlertaDeErro erro={erro} />}
      <div className="d-flex flex-wrap gap-2">
        <button
          className={`btn btn-sm ${suspensao ? 'btn-danger' : 'btn-primary'}`}
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar ? 'A guardar…' : DECISOES[decisao].confirmar}
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
