import { Link } from 'react-router';
import Ilustracao from './Ilustracao.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';
import {
  CATEGORIAS,
  ILUSTRACAO_DA_CATEGORIA,
  semAcentos,
} from '../produtos.js';

// As categorias com produtos, cada uma com quantos tem (contados a partir do catálogo). No telemóvel
// ficam numa faixa que desliza; no computador, numa grelha.
export default function CategoriasInicio({ produtos }) {
  const quantos = {};
  for (const { categoria } of produtos) {
    quantos[categoria] = (quantos[categoria] ?? 0) + 1;
  }
  const categorias = CATEGORIAS.filter((categoria) => quantos[categoria] > 0);
  if (categorias.length === 0) {
    return null;
  }

  return (
    <SeccaoInicio
      titulo="Categorias"
      ligacao="/produtos"
      textoDaLigacao="Ver todos os produtos"
    >
      <ul className="categorias-inicio">
        {categorias.map((categoria) => (
          <li key={categoria}>
            <Link
              className="categoria-inicio"
              to={`/produtos?categoria=${encodeURIComponent(categoria)}`}
            >
              <span
                className={`categoria-inicio-imagem tom-${semAcentos(categoria)}`}
              >
                <Ilustracao nome={ILUSTRACAO_DA_CATEGORIA[categoria]} />
              </span>
              <span className="fw-bold">{categoria}</span>
              <span className="small text-body-secondary">
                {quantos[categoria] === 1
                  ? '1 produto'
                  : `${quantos[categoria]} produtos`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SeccaoInicio>
  );
}
