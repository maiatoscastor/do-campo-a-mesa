import { Link, Navigate, useLocation } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';

// Início de sessão. Quem veio de uma página protegida volta a ela depois de entrar.
export default function Entrar() {
  const { utilizador, entrar } = useSessao();
  const { state } = useLocation();
  const { valores, mudar, erro, aEnviar, enviar } = useFormulario({
    email: '',
    password: '',
  });

  // Ao entrar, a sessão muda e o componente volta a ser desenhado: é aqui que segue em frente
  if (utilizador) {
    return <Navigate to={state?.depois ?? '/'} replace />;
  }

  function submeter(evento) {
    evento.preventDefault();
    enviar(() => entrar(valores));
  }

  return (
    <>
      <title>Entrar · Do Campo à Mesa</title>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6 col-xl-5">
          <h1 className="mb-3">Entrar</h1>
          {state?.depois && (
            <p className="text-body-secondary">
              Entre na sua conta para continuar.
            </p>
          )}
          <AlertaDeErro erro={erro} />
          {/* noValidate: as validações e as mensagens vêm todas da API */}
          <form onSubmit={submeter} noValidate>
            <Campo
              rotulo="Email"
              nome="email"
              tipo="email"
              autoComplete="email"
              value={valores.email}
              onChange={mudar}
            />
            <Campo
              rotulo="Password"
              nome="password"
              tipo="password"
              autoComplete="current-password"
              value={valores.password}
              onChange={mudar}
            />
            <button
              className="btn btn-primary w-100"
              type="submit"
              disabled={aEnviar}
            >
              {aEnviar ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
          <p className="mt-3 mb-0 text-center">
            Ainda não tem conta?{' '}
            <Link to="/registar" state={state}>
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
