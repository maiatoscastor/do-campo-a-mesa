import { useId } from 'react';
import AlertaDeErro from './AlertaDeErro.jsx';
import Campo from './Campo.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';

// O formulário para denunciar uma avaliação ou um produtor, que abre logo ali: o motivo (de uma
// lista) e, se quiser, mais pormenores (obrigatórios no "Outro motivo"). Nada muda depois de
// denunciar: quem decide é o administrador. "caminho" é o endereço da API onde a denúncia é feita.
export default function FormularioDaDenuncia({
  caminho,
  pergunta,
  motivos,
  aoEnviar,
  aoCancelar,
}) {
  const { pedir } = useSessao();
  const id = useId();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    motivo: '',
    descricao: '',
  });
  const detalhes = erro?.detalhes ?? {};

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      await pedir(caminho, {
        metodo: 'POST',
        corpo: {
          motivo: valores.motivo || undefined,
          descricao: valores.descricao,
        },
      });
      aoEnviar();
    });
  }

  return (
    <form
      className="formulario-denuncia"
      ref={formulario}
      onSubmit={submeter}
      noValidate
    >
      <fieldset
        className="mb-3"
        aria-describedby={detalhes.motivo ? `${id}-erro` : undefined}
      >
        <legend className="form-label">{pergunta}</legend>
        {motivos.map(({ valor, nome }, posicao) => (
          <div className="form-check" key={valor}>
            <input
              className={`form-check-input ${detalhes.motivo ? 'is-invalid' : ''}`}
              type="radio"
              name="motivo"
              id={`${id}-${valor}`}
              value={valor}
              checked={valores.motivo === valor}
              onChange={mudar}
              // O cursor vai logo para a primeira opção, para quem usa o teclado
              autoFocus={posicao === 0}
            />
            <label className="form-check-label" htmlFor={`${id}-${valor}`}>
              {nome}
            </label>
          </div>
        ))}
        {detalhes.motivo && (
          <div id={`${id}-erro`} className="invalid-feedback d-block">
            {detalhes.motivo}
          </div>
        )}
      </fieldset>
      <Campo
        rotulo={
          valores.motivo === 'outro'
            ? 'O que se passa?'
            : 'Mais pormenores (opcional)'
        }
        nome="descricao"
        tipo="textarea"
        rows={2}
        maxLength={500}
        ajuda="Só o administrador vê a denúncia."
        value={valores.descricao}
        onChange={mudar}
        erro={detalhes.descricao}
      />
      {!erro?.detalhes && <AlertaDeErro erro={erro} />}
      <div className="d-flex flex-wrap gap-2">
        <button
          className="btn btn-suave-perigo btn-sm"
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar ? 'A enviar…' : 'Enviar a denúncia'}
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
