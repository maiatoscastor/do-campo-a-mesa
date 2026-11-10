import { Link } from 'react-router';
import Estrelas from './Estrelas.jsx';
import Icone from './Icone.jsx';
import {
  formatarMedia,
  textoDasAvaliacoes,
  textoDasEstrelas,
} from '../avaliacoes.js';

const NUMEROS = [5, 4, 3, 2, 1];

// O resumo das avaliações de um produtor: a média, as estrelas, o total e uma barra por número de
// estrelas. Na página das avaliações, tocar numa barra filtra a lista ("filtrar"); na página do
// produtor, cada barra leva à lista já filtrada ("ligacao"). O "children" fica por baixo da nota
// (por exemplo, o botão para ler as avaliações).
export default function ResumoDasAvaliacoes({
  resumo,
  estrelas,
  filtrar,
  ligacao,
  children,
}) {
  const { media, total, distribuicao } = resumo;
  return (
    <section
      className="card resumo-avaliacoes"
      aria-label="Resumo das avaliações"
    >
      <div className="card-body resumo-avaliacoes-corpo">
        <div className="resumo-avaliacoes-nota">
          <span className="nota-geral-numero">{formatarMedia(media)}</span>
          <Estrelas valor={media} tamanho={22} />
          <span className="text-body-secondary">
            {textoDasAvaliacoes(total)}
          </span>
        </div>
        <ul className="distribuicao">
          {NUMEROS.map((numero) => (
            <li key={numero}>
              <Barra
                numero={numero}
                quantas={distribuicao[numero]}
                total={total}
                premida={estrelas === numero}
                filtrar={filtrar}
                ligacao={ligacao}
              />
            </li>
          ))}
        </ul>
        {children && <div className="resumo-avaliacoes-acoes">{children}</div>}
      </div>
    </section>
  );
}

// Uma barra: um botão que filtra, uma ligação para a lista filtrada, ou só a barra (sem avaliações
// com esse número de estrelas não há nada para abrir)
function Barra({ numero, quantas, total, premida, filtrar, ligacao }) {
  const conteudo = (
    <>
      <span className="distribuicao-estrelas">
        {numero}
        <Icone nome="estrela" cheio tamanho={14} />
      </span>
      <span className="distribuicao-trilho" aria-hidden="true">
        <span style={{ width: `${(quantas / total) * 100}%` }} />
      </span>
      <span className="distribuicao-quantas">{quantas}</span>
      <span className="visually-hidden">
        {textoDasAvaliacoes(quantas)} com {textoDasEstrelas(numero)}
      </span>
    </>
  );
  if (filtrar) {
    return (
      <button
        className="distribuicao-barra"
        type="button"
        aria-pressed={premida}
        disabled={quantas === 0}
        onClick={() => filtrar(numero)}
      >
        {conteudo}
      </button>
    );
  }
  if (ligacao && quantas > 0) {
    return (
      <Link className="distribuicao-barra" to={`${ligacao}?estrelas=${numero}`}>
        {conteudo}
      </Link>
    );
  }
  return (
    <span className="distribuicao-barra distribuicao-barra-vazia">
      {conteudo}
    </span>
  );
}
