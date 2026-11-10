import { useId, useState } from 'react';
import Icone from './Icone.jsx';
import { SIGNIFICADO_DAS_ESTRELAS, textoDasEstrelas } from '../avaliacoes.js';

const CINCO = [1, 2, 3, 4, 5];

// Escolher de 1 a 5 estrelas. São cinco botões de opção (radio) escondidos, cada um com a sua estrela:
// funciona com o rato, com o dedo e com o teclado (as setas mudam a escolha), e os leitores de ecrã
// lêem "4 estrelas, Bom". Ao passar o rato, as estrelas acendem até onde ele está. Nas opcionais
// (as dos produtos), "Limpar" tira a escolha.
export default function EscolherEstrelas({
  rotulo,
  nome,
  valor,
  aoMudar,
  erro,
  opcional = false,
  pequenas = false,
}) {
  const id = useId();
  const [realce, setRealce] = useState(0);
  const mostrado = realce || valor || 0;

  return (
    <fieldset
      className={`escolher-estrelas ${pequenas ? 'escolher-estrelas-pequenas' : ''}`}
      aria-describedby={erro ? `${id}-erro` : undefined}
    >
      <legend className={pequenas ? 'escolher-estrelas-nome' : 'form-label'}>
        {rotulo}
      </legend>
      <div className="escolher-estrelas-linha">
        <div
          className="escolher-estrelas-opcoes"
          onMouseLeave={() => setRealce(0)}
        >
          {CINCO.map((n) => (
            <label
              key={n}
              className="escolher-estrela"
              onMouseEnter={() => setRealce(n)}
            >
              <input
                className={`visually-hidden ${erro && n === 1 ? 'is-invalid' : ''}`}
                type="radio"
                name={nome}
                value={n}
                checked={valor === n}
                onChange={() => aoMudar(n)}
              />
              <Icone
                nome="estrela"
                cheio={n <= mostrado}
                tamanho={pequenas ? 24 : 36}
              />
              <span className="visually-hidden">
                {textoDasEstrelas(n)}, {SIGNIFICADO_DAS_ESTRELAS[n]}
              </span>
            </label>
          ))}
        </div>
        <span className="escolher-estrelas-texto" aria-hidden="true">
          {SIGNIFICADO_DAS_ESTRELAS[mostrado] ?? ''}
        </span>
        {opcional && valor && (
          <button
            className="btn btn-link btn-sm p-0 ms-auto"
            type="button"
            onClick={() => aoMudar(null)}
          >
            Limpar
          </button>
        )}
      </div>
      {erro && (
        <div id={`${id}-erro`} className="invalid-feedback d-block">
          {erro}
        </div>
      )}
    </fieldset>
  );
}
