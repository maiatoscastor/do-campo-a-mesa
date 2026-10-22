// Rodapé. A aplicação é um trabalho académico, e o rodapé di-lo em todas as páginas, para ninguém
// a confundir com uma loja real. Só usa utilitários do Bootstrap; o mt-auto empurra-o para o
// fundo do ecrã quando há pouco conteúdo.
export default function Rodape() {
  return (
    <footer className="mt-auto border-top py-4 small text-body-secondary">
      <div className="container">
        <p className="mb-0">
          Do Campo à Mesa é um projeto académico de Desenvolvimento Web e para a
          Cloud (IPVC–ESTG, 2026/2027).
        </p>
      </div>
    </footer>
  );
}
