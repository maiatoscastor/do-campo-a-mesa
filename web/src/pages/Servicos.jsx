import { useEffect, useState } from 'react';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Icone from '../components/Icone.jsx';
import { ENDERECO_API } from '../api/cliente.js';
import { useSessao } from '../hooks/useSessao.js';

// De quanto em quanto tempo o estado é verificado outra vez, com a página aberta
const ATUALIZAR = 30000;

const HORA = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const DIA_E_HORA = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const NUMERO = new Intl.NumberFormat('pt-PT');

// O nome de cada serviço e o pormenor que se mostra quando está a funcionar
const SERVICOS = {
  api: {
    nome: 'API REST',
    pormenor: ({ ativaDesde, node, memoriaMb }) =>
      `Ligada desde ${DIA_E_HORA.format(new Date(ativaDesde))} · Node ${node} · ${memoriaMb} MB de memória`,
  },
  mongodb: {
    nome: 'Base de dados (MongoDB)',
    pormenor: ({ baseDeDados }) => `Base de dados ${baseDeDados}`,
  },
  socket: {
    nome: 'Tempo real (Socket.io)',
    pormenor: ({ ligacoes, pessoas }) =>
      `${ligacoes} ${ligacoes === 1 ? 'ligação' : 'ligações'} · ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`,
  },
  armazenamento: {
    nome: 'Imagens',
    // No disco conta-se o que lá está; no Vercel Blob, contar gastava a quota gratuita, e a
    // verificação fica guardada uns minutos (por isso diz a que horas foi feita)
    pormenor: ({ tipo, ficheiros, tamanhoMb, verificadoEm }) =>
      verificadoEm
        ? `${tipo} · verificado às ${HORA.format(new Date(verificadoEm))}`
        : `${tipo} · ${ficheiros} ${ficheiros === 1 ? 'ficheiro' : 'ficheiros'} · ${NUMERO.format(tamanhoMb)} MB`,
  },
  swagger: {
    nome: 'Documentação da API (Swagger UI)',
    pormenor: ({ versao, operacoes }) =>
      `OpenAPI ${versao} · ${operacoes} operações`,
  },
};

// O estado dos serviços (/admin/servicos): cada parte da aplicação verificada pelo servidor no momento
// (a API, o MongoDB, o Socket.io, as imagens e a documentação), com o tempo que demorou a responder.
// Volta a ser verificado de 30 em 30 segundos, ou quando se carrega no botão.
export default function Servicos() {
  const { pedir } = useSessao();
  const [estado, setEstado] = useState(null);
  const [erro, setErro] = useState(null);
  const [aVerificar, setAVerificar] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let cancelado = false;
    const verificar = () => {
      setAVerificar(true);
      pedir('/admin/servicos')
        .then((dados) => {
          if (!cancelado) {
            setEstado(dados);
            setErro(null);
          }
        })
        .catch((problema) => !cancelado && setErro(problema))
        .finally(() => !cancelado && setAVerificar(false));
    };
    verificar();
    const relogio = setInterval(verificar, ATUALIZAR);
    return () => {
      cancelado = true;
      clearInterval(relogio);
    };
  }, [pedir, versao]);

  const comProblemas =
    estado?.servicos.filter((servico) => servico.estado !== 'ok').length ?? 0;

  return (
    <>
      <title>Estado dos serviços · Do Campo à Mesa</title>
      <h1 className="mb-1">Estado dos serviços</h1>
      <p className="text-body-secondary">
        Cada parte da aplicação, verificada pelo servidor agora mesmo.
      </p>
      <AlertaDeErro erro={erro} />
      {estado && (
        <div
          className={`servicos-resumo ${comProblemas > 0 ? 'servicos-resumo-problema' : ''}`}
          role="status"
        >
          <Icone
            nome={comProblemas > 0 ? 'problema' : 'ok'}
            cheio
            tamanho={28}
          />
          <span>
            <strong className="d-block">
              {comProblemas === 0
                ? 'Tudo a funcionar'
                : `${comProblemas} ${comProblemas === 1 ? 'serviço' : 'serviços'} com problemas`}
            </strong>
            <span className="small">
              Verificado às {HORA.format(new Date(estado.verificadoEm))}
            </span>
          </span>
        </div>
      )}
      {!estado && !erro && <p className="text-body-secondary">A verificar…</p>}
      {estado && (
        <ul className="list-group mb-3">
          {estado.servicos.map((servico) => (
            <Servico key={servico.servico} {...servico} />
          ))}
        </ul>
      )}
      <button
        className="btn btn-suave"
        type="button"
        disabled={aVerificar}
        onClick={() => setVersao((n) => n + 1)}
      >
        {aVerificar ? 'A verificar…' : 'Verificar outra vez'}
      </button>
    </>
  );
}

function Servico({ servico, estado, latenciaMs, detalhes, mensagem }) {
  const { nome, pormenor } = SERVICOS[servico] ?? {
    nome: servico,
    pormenor: () => '',
  };
  const ok = estado === 'ok';
  return (
    <li className="list-group-item servico">
      <span className="servico-texto">
        <span className="fw-bold d-block">{nome}</span>
        <span className="small text-body-secondary d-block">
          {ok ? pormenor(detalhes) : mensagem}
        </span>
        {ok && servico === 'swagger' && (
          <a
            className="small fw-semibold"
            href={`${ENDERECO_API}${detalhes.endereco}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir a documentação
          </a>
        )}
      </span>
      <span className="servico-estado">
        <span
          className={`selo ${ok ? 'selo-servico-ok' : 'selo-servico-erro'}`}
        >
          <Icone nome={ok ? 'ok' : 'problema'} cheio tamanho={14} />
          {ok ? 'A funcionar' : 'Com problemas'}
        </span>
        <span className="small text-body-secondary numeros">
          {latenciaMs} ms
        </span>
      </span>
    </li>
  );
}
