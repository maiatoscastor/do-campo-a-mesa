import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import EscolherEstrelas from '../components/EscolherEstrelas.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarData } from '../encomendas.js';

// Avaliar uma encomenda entregue (/encomendas/:id/avaliar): as estrelas e o comentário sobre o
// produtor, e estrelas opcionais para cada produto. Se a encomenda já tiver avaliação, o formulário
// abre com ela, para a mudar.
export default function AvaliarEncomenda() {
  const { id } = useParams();
  const { utilizador, pedir } = useSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    async function ler() {
      const encomenda = await pedir(`/orders/${id}`);
      const avaliacao = encomenda.avaliacao
        ? await pedir(`/reviews/${encomenda.avaliacao.id}`)
        : null;
      return { encomenda, avaliacao };
    }
    ler()
      .then((lidos) => !cancelado && setDados(lidos))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [id, pedir]);

  if (erro || !dados) {
    return (
      <>
        <title>Avaliar a encomenda · Do Campo à Mesa</title>
        <h1 className="mb-3">Avaliar a encomenda</h1>
        <AlertaDeErro erro={erro} />
        {!erro && <p className="text-body-secondary">A carregar…</p>}
      </>
    );
  }

  const { encomenda, avaliacao } = dados;
  let impedimento = null;
  if (encomenda.comprador.id !== utilizador.id) {
    impedimento = {
      titulo: 'Ainda não pode avaliar',
      texto: 'Só quem fez a encomenda a pode avaliar.',
    };
  } else if (encomenda.estado !== 'entregue') {
    impedimento = {
      titulo: 'Ainda não pode avaliar',
      texto: 'Pode avaliar a encomenda depois de ela ser entregue.',
    };
  } else if (avaliacao?.visivel === false) {
    impedimento = {
      titulo: 'A sua avaliação foi ocultada',
      texto: `O administrador ocultou-a e já não pode ser mudada. Motivo: ${avaliacao.moderacao?.motivo ?? 'não indicado.'}`,
    };
  }
  if (impedimento) {
    return (
      <>
        <title>Avaliar a encomenda · Do Campo à Mesa</title>
        <EstadoVazio
          icone="estrela"
          titulo={impedimento.titulo}
          texto={impedimento.texto}
        >
          <Link className="btn btn-primary" to="/encomendas">
            Ver as encomendas
          </Link>
        </EstadoVazio>
      </>
    );
  }

  return <FormularioDaAvaliacao encomenda={encomenda} avaliacao={avaliacao} />;
}

function FormularioDaAvaliacao({ encomenda, avaliacao }) {
  const { pedir } = useSessao();
  const navegar = useNavigate();
  const { produtor, linhas } = encomenda;
  const notasIniciais = Object.fromEntries(
    (avaliacao?.produtos ?? []).map(({ produto, classificacao }) => [
      produto,
      classificacao,
    ]),
  );
  const { valores, mudar, definir, erro, aEnviar, enviar, formulario } =
    useFormulario({
      classificacao: avaliacao?.classificacao ?? null,
      comentario: avaliacao?.comentario ?? '',
      produtos: notasIniciais,
    });
  const detalhes = erro?.detalhes ?? {};

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      const corpo = {
        classificacao: valores.classificacao ?? undefined,
        comentario: valores.comentario,
        produtos: Object.entries(valores.produtos)
          .filter(([, classificacao]) => classificacao)
          .map(([produto, classificacao]) => ({ produto, classificacao })),
      };
      await pedir(avaliacao ? `/reviews/${avaliacao.id}` : '/reviews', {
        metodo: avaliacao ? 'PUT' : 'POST',
        corpo: avaliacao ? corpo : { encomenda: encomenda.id, ...corpo },
      });
      navegar('/encomendas', { state: { avaliada: true } });
    });
  }

  return (
    <>
      <title>Avaliar a encomenda · Do Campo à Mesa</title>
      <h1 className="mb-1">
        {avaliacao ? 'Mudar a avaliação' : 'Avaliar a encomenda'}
      </h1>
      <p className="text-body-secondary mb-4">
        {produtor.nomeExploracao} · feita a {formatarData(encomenda.createdAt)}
      </p>

      <form
        className="formulario-avaliacao"
        ref={formulario}
        onSubmit={submeter}
        noValidate
      >
        <AlertaDeErro erro={erro} />
        <section className="card mb-4">
          <div className="card-body">
            <EscolherEstrelas
              rotulo="Como correu a encomenda?"
              nome="classificacao"
              valor={valores.classificacao}
              aoMudar={(estrelas) => definir('classificacao', estrelas)}
              erro={detalhes.classificacao}
            />
            <Campo
              rotulo="Comentário (opcional)"
              nome="comentario"
              tipo="textarea"
              rows={4}
              maxLength={1000}
              placeholder="A qualidade, a frescura, o atendimento, o levantamento ou a entrega…"
              ajuda={`${valores.comentario.length} de 1000 caracteres. Fica público, com o seu primeiro nome e a inicial do apelido.`}
              value={valores.comentario}
              onChange={mudar}
              erro={detalhes.comentario}
            />
          </div>
        </section>

        <section className="card mb-4" aria-labelledby="notas-dos-produtos">
          <div className="card-body">
            <h2 className="h6 mb-1" id="notas-dos-produtos">
              E os produtos? (opcional)
            </h2>
            <p className="small text-body-secondary">
              As estrelas de cada produto aparecem no catálogo.
            </p>
            {linhas.map(({ produto, nome }) => (
              <EscolherEstrelas
                key={produto}
                rotulo={nome}
                nome={`produto-${produto}`}
                valor={valores.produtos[produto] ?? null}
                aoMudar={(estrelas) =>
                  definir('produtos', {
                    ...valores.produtos,
                    [produto]: estrelas,
                  })
                }
                opcional
                pequenas
              />
            ))}
          </div>
        </section>

        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit" disabled={aEnviar}>
            {aEnviar && 'A enviar…'}
            {!aEnviar &&
              (avaliacao ? 'Guardar alterações' : 'Publicar avaliação')}
          </button>
          <Link className="btn btn-suave" to="/encomendas">
            Cancelar
          </Link>
        </div>
      </form>
    </>
  );
}
