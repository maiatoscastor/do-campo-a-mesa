// Mostra o erro de um pedido à API. Quando há mensagens por campo, elas aparecem junto de cada campo
// e aqui só se avisa. O role="alert" faz os leitores de ecrã anunciarem o erro assim que aparece.
export default function AlertaDeErro({ erro }) {
  if (!erro) {
    return null;
  }

  return (
    <div className="alert alert-danger" role="alert">
      {erro.detalhes ? 'Reveja os campos assinalados.' : erro.message}
    </div>
  );
}
