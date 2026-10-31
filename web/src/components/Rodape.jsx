// Rodapé. O ano vem do relógio, para nunca ficar desatualizado. Só usa utilitários do Bootstrap;
// o mt-auto empurra-o para o fundo do ecrã quando há pouco conteúdo.
export default function Rodape() {
  return (
    <footer className="mt-auto border-top py-4 small text-body-secondary">
      <div className="container">
        <p className="mb-0">
          © {new Date().getFullYear()} Do Campo à Mesa · Produtos locais do Alto
          Minho
        </p>
      </div>
    </footer>
  );
}
