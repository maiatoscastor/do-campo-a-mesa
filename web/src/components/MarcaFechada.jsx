import Icone from './Icone.jsx';

// Cadeado pequeno ao lado de um destino que exige conta. O destino continua visível e clicável: a
// marca só avisa. O texto escondido diz o mesmo a quem usa um leitor de ecrã.
export default function MarcaFechada({ className }) {
  return (
    <span className={className}>
      <Icone nome="cadeado" cheio tamanho={12} />
      <span className="visually-hidden"> (exige conta)</span>
    </span>
  );
}
