import Icone from './Icone.jsx';

// Mensagem para quando uma lista não tem nada para mostrar. A aplicação nunca inventa conteúdo:
// sem dados reais, diz que não há e, se fizer sentido, sugere o que fazer a seguir (children).
export default function EstadoVazio({ icone, titulo, texto, children }) {
  return (
    <section className="estado-vazio">
      <span className="estado-vazio-icone">
        <Icone nome={icone} tamanho={32} />
      </span>
      <h2 className="h3 mb-0">{titulo}</h2>
      <p className="text-body-secondary mb-0">{texto}</p>
      {children}
    </section>
  );
}
