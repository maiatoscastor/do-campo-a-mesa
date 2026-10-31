import { Link } from 'react-router';

// Página para os endereços que não existem.
export default function PaginaNaoEncontrada() {
  return (
    <>
      <title>Página não encontrada · Do Campo à Mesa</title>
      <h1>Esta página não existe</h1>
      <p className="text-body-secondary">
        O endereço pode estar errado ou a página pode ter mudado de sítio.
      </p>
      <Link to="/">Voltar ao início</Link>
    </>
  );
}
