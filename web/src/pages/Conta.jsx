import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSessao } from '../hooks/useSessao.js';
import { textoDaLocalizacao } from '../localizacao.js';

const PAPEIS = {
  comprador: 'Comprador',
  produtor: 'Produtor',
  admin: 'Administrador',
};

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

// Dados de quem tem a sessão iniciada.
export default function Conta() {
  const { utilizador, atualizar, sair } = useSessao();
  const { nome, email, papel, produtor } = utilizador;
  const validacao = produtor && VALIDACAO[produtor.validacao];
  const navegar = useNavigate();

  // Volta ao início. O flushSync muda de página antes de a sessão acabar: sem ele, via-se por um
  // instante a mensagem de que esta página exige conta.
  function terminarSessao() {
    navegar('/', { flushSync: true });
    sair();
  }

  // O estado da validação pode ter mudado desde que a página foi aberta. Se o pedido falhar, os dados
  // que já estão no ecrã continuam válidos.
  useEffect(() => {
    atualizar().catch(() => {});
  }, [atualizar]);

  return (
    <>
      <title>A minha conta · Do Campo à Mesa</title>
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8 col-xl-6">
          <h1 className="mb-3">A minha conta</h1>

          <section className="card mb-3">
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

          {produtor && (
            <section className="card mb-3">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <h2 className="h3 mb-0 me-auto">Quinta ou negócio</h2>
                  <span className={`badge ${validacao.classe}`}>
                    {validacao.nome}
                  </span>
                </div>
                <p className="text-body-secondary">{validacao.texto}</p>
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
          )}

          <div className="d-flex flex-wrap gap-2">
            {papel === 'admin' && (
              <Link className="btn btn-primary" to="/admin/produtores">
                Validar produtores
              </Link>
            )}
            <button
              className="btn btn-suave"
              type="button"
              onClick={terminarSessao}
            >
              Terminar sessão
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
