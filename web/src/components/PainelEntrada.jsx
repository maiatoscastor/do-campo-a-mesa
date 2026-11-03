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

// Painel ao lado do formulário, no computador. Só decoração e a frase da marca: sem números nem
// testemunhos, porque a aplicação não inventa conteúdo.
export default function PainelEntrada() {
  return (
    <aside className="painel-entrada">
      <div className="mosaico">
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
      <p className="painel-entrada-titulo">
        Produtos do Alto Minho, diretamente de quem os produz.
      </p>
    </aside>
  );
}
