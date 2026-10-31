import { Link } from 'react-router';
import EstadoVazio from '../components/EstadoVazio.jsx';

// Carrinho de compras.
export default function Carrinho() {
  return (
    <>
      <title>Carrinho · Do Campo à Mesa</title>
      <h1 className="mb-3">Carrinho</h1>
      <EstadoVazio
        icone="carrinho"
        titulo="O carrinho está vazio"
        texto="Os produtos que escolher ficam aqui até fazer a encomenda."
      >
        <Link className="btn btn-primary" to="/produtos">
          Ver produtos
        </Link>
      </EstadoVazio>
    </>
  );
}
