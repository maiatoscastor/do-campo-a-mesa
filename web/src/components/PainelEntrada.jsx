import Mosaico from './Mosaico.jsx';

// Painel ao lado do formulário, no computador. Só decoração e a frase da marca: sem números nem
// testemunhos, porque a aplicação não inventa conteúdo.
export default function PainelEntrada() {
  return (
    <aside className="painel-entrada">
      <Mosaico />
      <p className="painel-entrada-titulo">
        Produtos do Alto Minho, diretamente de quem os produz.
      </p>
    </aside>
  );
}
