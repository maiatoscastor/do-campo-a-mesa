import { Link } from 'react-router';
import Icone from './Icone.jsx';

// Um cartão do início que leva a uma secção: o ícone, o título, uma linha com o estado (por exemplo,
// "2 por confirmar") e, quando há alguma coisa à espera de quem tem a sessão, a bola vermelha com o
// número. "sufixo" é o que os leitores de ecrã ouvem a seguir ao número.
export default function AtalhoInicio({
  caminho,
  icone,
  titulo,
  texto,
  numero,
  sufixo,
}) {
  return (
    <Link className="card cartao-atalho h-100" to={caminho}>
      <div className="card-body d-flex align-items-center gap-3">
        <span className="cartao-atalho-icone">
          <Icone nome={icone} />
        </span>
        <div className="flex-grow-1 lista-produtos-texto">
          <p className="fw-bold mb-0">{titulo}</p>
          <p className="small text-body-secondary mb-0">{texto}</p>
        </div>
        {numero > 0 && (
          <span className="contador">
            <span aria-hidden="true">{numero}</span>
            {sufixo && (
              <span className="visually-hidden">
                {numero} {sufixo}
              </span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}
