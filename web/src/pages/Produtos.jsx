import EstadoVazio from '../components/EstadoVazio.jsx';

// Catálogo de produtos.
export default function Produtos() {
  return (
    <>
      <title>Produtos · Do Campo à Mesa</title>
      <h1 className="mb-3">Produtos</h1>
      <EstadoVazio
        icone="produtos"
        titulo="Ainda não há produtos"
        texto="Os produtos aparecem aqui assim que os produtores os publicarem."
      />
    </>
  );
}
