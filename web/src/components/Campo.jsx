import { useId } from 'react';

// Campo de formulário com rótulo, ajuda e mensagem de erro. O useId liga o rótulo e as mensagens ao
// campo, para os leitores de ecrã os lerem juntos. Os restantes atributos (value, onChange…) passam
// diretamente para o elemento.
export default function Campo({
  rotulo,
  nome,
  tipo = 'text',
  erro,
  ajuda,
  children,
  ...resto
}) {
  const id = useId();
  const Elemento = tipo === 'select' || tipo === 'textarea' ? tipo : 'input';
  const classeBase = tipo === 'select' ? 'form-select' : 'form-control';
  const mensagem = erro ?? ajuda;

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {rotulo}
      </label>
      <Elemento
        id={id}
        name={nome}
        type={Elemento === 'input' ? tipo : undefined}
        className={erro ? `${classeBase} is-invalid` : classeBase}
        aria-invalid={erro ? true : undefined}
        aria-describedby={mensagem ? `${id}-mensagem` : undefined}
        {...resto}
      >
        {children}
      </Elemento>
      {mensagem && (
        <div
          id={`${id}-mensagem`}
          className={erro ? 'invalid-feedback' : 'form-text'}
        >
          {mensagem}
        </div>
      )}
    </div>
  );
}
