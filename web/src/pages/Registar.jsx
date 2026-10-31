import { Link, Navigate, useLocation } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { LOCALIDADES } from '../localidades.js';

const TIPOS_DE_CONTA = [
  {
    valor: 'comprador',
    titulo: 'Comprador',
    texto: 'Encomendar produtos e licitar em leilões.',
  },
  {
    valor: 'produtor',
    titulo: 'Produtor',
    texto:
      'Vender os seus produtos, depois de um administrador validar a conta.',
  },
];

// Criação de conta de comprador ou de produtor. Administradores não se registam aqui.
export default function Registar() {
  const { utilizador, registar } = useSessao();
  const { state } = useLocation();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    papel: 'comprador',
    nome: '',
    email: '',
    password: '',
    nomeExploracao: '',
    localidade: '',
    descricao: '',
  });
  const detalhes = erro?.detalhes ?? {};

  // O produtor segue para a conta, onde vê que está à espera de validação
  if (utilizador) {
    const destino = utilizador.papel === 'produtor' ? '/conta' : '/';
    return <Navigate to={state?.depois ?? destino} replace />;
  }

  function submeter(evento) {
    evento.preventDefault();
    enviar(() => registar(valores));
  }

  return (
    <>
      <title>Criar conta · Do Campo à Mesa</title>
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8 col-xl-6">
          <h1 className="mb-3">Criar conta</h1>
          <AlertaDeErro erro={erro} />
          <form ref={formulario} onSubmit={submeter} noValidate>
            <fieldset className="mb-3">
              <legend className="form-label">Tipo de conta</legend>
              <div className="row row-cols-1 row-cols-sm-2 g-2">
                {TIPOS_DE_CONTA.map(({ valor, titulo, texto }) => (
                  <div className="col" key={valor}>
                    <label className="opcao">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="papel"
                        value={valor}
                        checked={valores.papel === valor}
                        onChange={mudar}
                      />
                      <span>
                        <span className="d-block fw-bold">{titulo}</span>
                        <span className="d-block small text-body-secondary">
                          {texto}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>

            <Campo
              rotulo="Nome"
              nome="nome"
              autoComplete="name"
              value={valores.nome}
              onChange={mudar}
              erro={detalhes.nome}
            />
            <Campo
              rotulo="Email"
              nome="email"
              tipo="email"
              autoComplete="email"
              value={valores.email}
              onChange={mudar}
              erro={detalhes.email}
            />
            <Campo
              rotulo="Password"
              nome="password"
              tipo="password"
              autoComplete="new-password"
              ajuda="Pelo menos 8 caracteres."
              value={valores.password}
              onChange={mudar}
              erro={detalhes.password}
            />

            {valores.papel === 'produtor' && (
              <>
                <Campo
                  rotulo="Nome da exploração"
                  nome="nomeExploracao"
                  autoComplete="organization"
                  value={valores.nomeExploracao}
                  onChange={mudar}
                  erro={detalhes.nomeExploracao}
                />
                <Campo
                  rotulo="Localidade"
                  nome="localidade"
                  tipo="select"
                  value={valores.localidade}
                  onChange={mudar}
                  erro={detalhes.localidade}
                >
                  <option value="">Escolha o concelho</option>
                  {LOCALIDADES.map((localidade) => (
                    <option key={localidade}>{localidade}</option>
                  ))}
                </Campo>
                <Campo
                  rotulo="Descrição (opcional)"
                  nome="descricao"
                  tipo="textarea"
                  rows={3}
                  ajuda="O que produz e como trabalha. Aparece na sua página pública."
                  value={valores.descricao}
                  onChange={mudar}
                  erro={detalhes.descricao}
                />
              </>
            )}

            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={aEnviar}
            >
              {aEnviar ? 'A criar a conta…' : 'Criar conta'}
            </button>
          </form>
          <p className="mt-3 mb-0 text-center">
            Já tem conta?{' '}
            <Link to="/entrar" state={state}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
