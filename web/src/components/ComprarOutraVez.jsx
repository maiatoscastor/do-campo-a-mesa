import FilaDeProdutos from './FilaDeProdutos.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';

// No início do comprador: os produtos que já encomendou e ainda pode comprar (escolhidos pelo início,
// com produtosParaComprarOutraVez), para os pôr outra vez no carrinho sem os procurar
export default function ComprarOutraVez({ produtos, naColuna = false }) {
  if (produtos.length === 0) {
    return null;
  }
  return (
    <SeccaoInicio titulo="Comprar outra vez">
      <FilaDeProdutos produtos={produtos} naColuna={naColuna} />
    </SeccaoInicio>
  );
}
