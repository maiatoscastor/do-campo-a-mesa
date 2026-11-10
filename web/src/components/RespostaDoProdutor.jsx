import { useState } from 'react';
import AlertaDeErro from './AlertaDeErro.jsx';
import Campo from './Campo.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarDia } from '../avaliacoes.js';

// A resposta do produtor a uma avaliação. Todos a vêem; o produtor avaliado pode responder, mudar a
// resposta ou tirá-la, ali mesmo, sem sair da lista.
export default function RespostaDoProdutor({
  avaliacao,
  nomeDoProdutor,
  podeResponder,
  aoMudar,
}) {
  const { resposta } = avaliacao;
  const [aEscrever, setAEscrever] = useState(false);

  if (aEscrever) {
    return (
      <FormularioDaResposta
        avaliacao={avaliacao}
        aoMudar={(mudada) => {
          aoMudar(mudada);
          setAEscrever(false);
        }}
        aoCancelar={() => setAEscrever(false)}
      />
    );
  }

  return (
    <>
      {resposta && (
        <div className="resposta-produtor">
          <p className="small fw-bold mb-1">
            Resposta de {nomeDoProdutor}
            <span className="fw-normal text-body-secondary">
              {' '}
              · {formatarDia(resposta.data)}
            </span>
          </p>
          <p className="resposta-produtor-texto mb-0">{resposta.texto}</p>
        </div>
      )}
      {podeResponder && (
        <AcoesDaResposta
          avaliacao={avaliacao}
          escrever={() => setAEscrever(true)}
          aoMudar={aoMudar}
        />
      )}
    </>
  );
}

// Os botões do produtor: responder, ou mudar e tirar a resposta
function AcoesDaResposta({ avaliacao, escrever, aoMudar }) {
  const { pedir } = useSessao();
  const [erro, setErro] = useState(null);

  async function tirar() {
    if (!window.confirm('Tirar a resposta a esta avaliação?')) {
      return;
    }
    try {
      await pedir(`/reviews/${avaliacao.id}/resposta`, { metodo: 'DELETE' });
      aoMudar({ ...avaliacao, resposta: undefined });
    } catch (problema) {
      setErro(problema);
    }
  }

  return (
    <div className="mt-2">
      <AlertaDeErro erro={erro} />
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-suave btn-sm"
          type="button"
          onClick={escrever}
        >
          {avaliacao.resposta ? 'Mudar a resposta' : 'Responder'}
        </button>
        {avaliacao.resposta && (
          <button
            className="btn btn-suave-perigo btn-sm"
            type="button"
            onClick={tirar}
          >
            Tirar a resposta
          </button>
        )}
      </div>
    </div>
  );
}

function FormularioDaResposta({ avaliacao, aoMudar, aoCancelar }) {
  const { pedir } = useSessao();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    texto: avaliacao.resposta?.texto ?? '',
  });

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      const mudada = await pedir(`/reviews/${avaliacao.id}/resposta`, {
        metodo: 'PUT',
        corpo: { texto: valores.texto },
      });
      aoMudar(mudada);
    });
  }

  return (
    <form
      className="resposta-produtor"
      ref={formulario}
      onSubmit={submeter}
      noValidate
    >
      <Campo
        rotulo="A sua resposta"
        nome="texto"
        tipo="textarea"
        rows={3}
        maxLength={1000}
        // O produtor abriu o formulário para escrever: o cursor fica logo no campo
        autoFocus
        ajuda="Fica pública, por baixo da avaliação."
        value={valores.texto}
        onChange={mudar}
        erro={erro?.detalhes?.texto}
      />
      {!erro?.detalhes && <AlertaDeErro erro={erro} />}
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar ? 'A publicar…' : 'Publicar a resposta'}
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
