import EstadoVazio from '../components/EstadoVazio.jsx';

// Leilões em direto e agenda dos próximos leilões.
export default function Leiloes() {
  return (
    <>
      <title>Leilões · Do Campo à Mesa</title>
      <h1 className="mb-3">Leilões</h1>
      <EstadoVazio
        icone="leiloes"
        titulo="Ainda não há leilões"
        texto="Os leilões em direto e os próximos, com o dia e a hora em que começam, aparecem aqui assim que os produtores os criarem."
      />
    </>
  );
}
