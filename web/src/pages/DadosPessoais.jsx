import { useState } from 'react';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import Icone from '../components/Icone.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { PAPEIS } from '../utilizador.js';

// Primeira secção de "A minha conta": os dados de quem tem a sessão, com a opção de os editar.
export default function DadosPessoais() {
  const { nome, email, papel } = useSessao().utilizador;
  const [aEditar, setAEditar] = useState(false);
  const [mensagem, setMensagem] = useState('');

  function terminarEdicao(guardado) {
    setAEditar(false);
    setMensagem(guardado ? 'Os seus dados foram guardados.' : '');
  }

  return (
    <>
      <title>Dados pessoais · Do Campo à Mesa</title>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0 me-auto">Dados pessoais</h1>
        {!aEditar && (
          <button
            className="btn btn-suave btn-sm d-inline-flex align-items-center gap-1"
            type="button"
            onClick={() => {
              setMensagem('');
              setAEditar(true);
            }}
          >
            <Icone nome="editar" tamanho={18} />
            Editar
          </button>
        )}
      </div>

      {aEditar ? (
        <FormularioDados aoTerminar={terminarEdicao} />
      ) : (
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
      )}
      {/* Anunciado aos leitores de ecrã quando os dados são guardados */}
      <p className="small text-body-secondary mt-2" role="status">
        {mensagem}
      </p>
    </>
  );
}

// O tipo de conta não se muda aqui: só o nome e o email
function FormularioDados({ aoTerminar }) {
  const { utilizador, pedir, atualizar } = useSessao();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    nome: utilizador.nome,
    email: utilizador.email,
  });
  const detalhes = erro?.detalhes ?? {};

  function submeter(evento) {
    evento.preventDefault();
    enviar(async () => {
      await pedir('/auth/eu', { metodo: 'PATCH', corpo: valores });
      // Volta a ler a conta, para o nome mudar também no cabeçalho e no perfil
      await atualizar();
      aoTerminar(true);
    });
  }

  return (
    <section className="card">
      <div className="card-body">
        <AlertaDeErro erro={erro} />
        <form ref={formulario} onSubmit={submeter} noValidate>
          <Campo
            rotulo="Nome"
            nome="nome"
            icone="pessoa"
            autoComplete="name"
            value={valores.nome}
            onChange={mudar}
            erro={detalhes.nome}
          />
          <Campo
            rotulo="Email"
            nome="email"
            tipo="email"
            icone="correio"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={valores.email}
            onChange={mudar}
            erro={detalhes.email}
          />
          <div className="d-flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={aEnviar}
            >
              {aEnviar ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              className="btn btn-suave"
              type="button"
              onClick={() => aoTerminar(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
