import { useId } from 'react';
import Icone from './Icone.jsx';

// Campo de formulário com rótulo, ajuda e mensagem de erro. O useId liga o rótulo e as mensagens ao
// campo, para os leitores de ecrã os lerem juntos. O icone é um desenho à esquerda, e o acessorio um
// botão à direita (por exemplo, mostrar a password). Os restantes atributos (value, onChange…)
// passam diretamente para o elemento.
export default function Campo({
  rotulo,
  nome,
  tipo = 'text',
  erro,
  ajuda,
  icone,
  acessorio,
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
      <div className="campo-controlo">
        {icone && <Icone nome={icone} tamanho={20} className="campo-icone" />}
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
        {acessorio}
      </div>
      {mensagem && (
        <div
          id={`${id}-mensagem`}
          // d-block: o Bootstrap só mostra a mensagem logo a seguir ao campo, e aqui há um elemento
          // à volta dele
          className={erro ? 'invalid-feedback d-block' : 'form-text'}
        >
          {mensagem}
        </div>
      )}
    </div>
  );
}
