import { semanaDoLevantamento } from '../paginaDoProdutor.js';

// O horário de levantamento na quinta, com a semana toda. O dia de hoje fica destacado: a verde se
// houver levantamento, a cinzento se não houver. O aria-current diz aos leitores de ecrã qual é.
export default function HorarioLevantamento({ levantamento }) {
  return (
    <ul className="horario">
      {semanaDoLevantamento(levantamento).map(({ dia, nome, horas, hoje }) => (
        <li
          key={dia}
          className={`horario-dia ${horas ? '' : 'fechado'}`}
          aria-current={hoje ? 'date' : undefined}
        >
          <span className="d-inline-flex align-items-center gap-2">
            {nome}
            {hoje && <span className="selo selo-hoje">Hoje</span>}
          </span>
          <span>{horas ?? 'Fechado'}</span>
        </li>
      ))}
    </ul>
  );
}
