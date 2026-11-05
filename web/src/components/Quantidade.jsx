import Icone from './Icone.jsx';

// Escolha da quantidade com − e +, em botões grandes para o dedo. Na quantidade 1, o − passa a ser
// um caixote do lixo, porque tira o produto do carrinho. O número é anunciado quando muda.
export default function Quantidade({ nome, valor, maximo, aoMudar }) {
  const tirar = valor === 1;
  return (
    <div
      className="quantidade"
      role="group"
      aria-label={`Quantidade de ${nome}`}
    >
      <button
        className="quantidade-botao"
        type="button"
        aria-label={tirar ? `Tirar ${nome} do carrinho` : 'Menos um'}
        onClick={() => aoMudar(valor - 1)}
      >
        <Icone nome={tirar ? 'lixo' : 'menos'} tamanho={20} />
      </button>
      <output className="quantidade-valor" aria-live="polite">
        {valor}
      </output>
      <button
        className="quantidade-botao"
        type="button"
        aria-label="Mais um"
        disabled={valor >= maximo}
        onClick={() => aoMudar(valor + 1)}
      >
        <Icone nome="mais" tamanho={20} />
      </button>
    </div>
  );
}
