import Ilustracao from './Ilustracao.jsx';

// Ladrilhos do mosaico: o tom é a cor de fundo, e o tamanho está no CSS (_entrada.scss)
const LADRILHOS = [
  { ilustracao: 'kiwi', tom: 'verde', tamanho: 'grande' },
  { ilustracao: 'vinho', tom: 'ambar', tamanho: 'alto' },
  { ilustracao: 'mel', tom: 'neutro' },
  { ilustracao: 'abobora', tom: 'verde' },
  { ilustracao: 'queijo', tom: 'fundo' },
  { ilustracao: 'couve', tom: 'ambar' },
  { ilustracao: 'maca', tom: 'neutro' },
  { ilustracao: 'castanha', tom: 'verde' },
];

// O mosaico com as ilustrações dos produtos (no painel da entrada e no início, quando não há um
// leilão para pôr em destaque). Só decoração: sem números nem textos inventados.
export default function Mosaico() {
  return (
    <div className="mosaico" aria-hidden="true">
      {LADRILHOS.map(({ ilustracao, tom, tamanho }, ordem) => (
        <div
          key={ilustracao}
          className={`ladrilho ladrilho-${tom} ${tamanho ? `ladrilho-${tamanho}` : ''}`}
          // A ordem atrasa a animação de cada ladrilho, para aparecerem um a seguir ao outro
          style={{ '--ordem': ordem }}
        >
          <Ilustracao nome={ilustracao} />
        </div>
      ))}
    </div>
  );
}
