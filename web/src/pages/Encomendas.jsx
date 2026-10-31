import { Link } from 'react-router';
import EstadoVazio from '../components/EstadoVazio.jsx';

// Encomendas e o estado de cada uma.
export default function Encomendas() {
  return (
    <>
      <title>Encomendas · Do Campo à Mesa</title>
      <h1 className="mb-3">Encomendas</h1>
      <EstadoVazio
        icone="encomendas"
        titulo="Ainda não há encomendas"
        texto="As suas encomendas e o estado de cada uma aparecem aqui."
      >
        <Link className="btn btn-primary" to="/produtos">
          Ver produtos
        </Link>
      </EstadoVazio>
    </>
  );
}
