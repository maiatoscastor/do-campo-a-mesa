import Icone from './Icone.jsx';
import { formatarNota } from '../avaliacoes.js';

const CINCO = [1, 2, 3, 4, 5];

// Estrelas só para ver. As cheias ficam por cima das vazias, cortadas na percentagem da nota: uma
// média de 4,7 mostra quatro estrelas e quase toda a quinta. Para os leitores de ecrã, é uma imagem
// com a nota em texto ("4,7 de 5 estrelas").
export default function Estrelas({ valor, tamanho = 18, className = '' }) {
  return (
    <span
      className={`estrelas ${className}`}
      role="img"
      aria-label={`${formatarNota(valor)} de 5 estrelas`}
    >
      <span className="estrelas-vazias">
        {CINCO.map((n) => (
          <Icone key={n} nome="estrela" tamanho={tamanho} />
        ))}
      </span>
      <span
        className="estrelas-cheias"
        style={{ width: `${(valor / 5) * 100}%` }}
      >
        {CINCO.map((n) => (
          <Icone key={n} nome="estrela" cheio tamanho={tamanho} />
        ))}
      </span>
    </span>
  );
}
