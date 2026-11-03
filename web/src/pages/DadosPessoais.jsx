import { useSessao } from '../hooks/useSessao.js';
import { PAPEIS } from '../utilizador.js';

// Primeira secção de "A minha conta": os dados de quem tem a sessão.
export default function DadosPessoais() {
  const { nome, email, papel } = useSessao().utilizador;

  return (
    <>
      <title>Dados pessoais · Do Campo à Mesa</title>
      <h1 className="mb-3">Dados pessoais</h1>
      <section className="card">
        <div className="card-body">
          <dl className="mb-0">
            <dt>Nome</dt>
            <dd>{nome}</dd>
            <dt>Email</dt>
            <dd>{email}</dd>
            <dt>Tipo de conta</dt>
            <dd className="mb-0">{PAPEIS[papel]}</dd>
          </dl>
        </div>
      </section>
    </>
  );
}
