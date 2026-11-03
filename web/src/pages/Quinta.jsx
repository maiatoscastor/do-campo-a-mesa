import { useSessao } from '../hooks/useSessao.js';
import { textoDaLocalizacao } from '../localizacao.js';

const VALIDACAO = {
  pendente: {
    nome: 'À espera de validação',
    classe: 'bg-warning-subtle text-warning-emphasis',
    texto:
      'Um administrador vai rever os seus dados. Poderá publicar produtos assim que a conta for aprovada.',
  },
  aprovado: {
    nome: 'Aprovado',
    classe: 'bg-success-subtle text-success-emphasis',
    texto: 'A sua conta foi aprovada e já pode publicar produtos.',
  },
  rejeitado: {
    nome: 'Não aprovado',
    classe: 'bg-danger-subtle text-danger-emphasis',
    texto:
      'A sua conta de produtor não foi aprovada, por isso não pode publicar produtos.',
  },
};

// Secção do produtor em "A minha conta": a quinta ou o negócio e o estado da validação.
export default function Quinta() {
  const { produtor } = useSessao().utilizador;
  const validacao = VALIDACAO[produtor.validacao];

  return (
    <>
      <title>Quinta ou negócio · Do Campo à Mesa</title>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0 me-auto">Quinta ou negócio</h1>
        <span className={`badge ${validacao.classe}`}>{validacao.nome}</span>
      </div>
      <p className="text-body-secondary">{validacao.texto}</p>
      <section className="card">
        <div className="card-body">
          <dl className="mb-0">
            <dt>Nome</dt>
            <dd>{produtor.nomeExploracao}</dd>
            <dt>Localidade</dt>
            <dd className={produtor.descricao ? undefined : 'mb-0'}>
              {textoDaLocalizacao(produtor.localizacao)}
            </dd>
            {produtor.descricao && (
              <>
                <dt>Descrição</dt>
                <dd className="mb-0">{produtor.descricao}</dd>
              </>
            )}
          </dl>
        </div>
      </section>
    </>
  );
}
