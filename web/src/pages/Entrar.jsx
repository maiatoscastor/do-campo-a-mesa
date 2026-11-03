import { Navigate, useLocation } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import CampoPassword from '../components/CampoPassword.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';

// Início de sessão. Quem veio de uma página que exige conta volta a ela depois de entrar.
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
      <h1>Olá de novo</h1>
      {state?.depois && (
        <p className="text-body-secondary">Entre para continuar onde estava.</p>
      )}
      <AlertaDeErro erro={erro} />
      {/* noValidate: as validações e as mensagens vêm todas da API.
          O autoComplete é o que permite aos gestores de passwords preencher o formulário. */}
      <form onSubmit={submeter} noValidate>
        <Campo
          rotulo="Email"
          nome="email"
          tipo="email"
          icone="correio"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={valores.email}
          onChange={mudar}
        />
        <CampoPassword
          rotulo="Password"
          nome="password"
          autoComplete="current-password"
          value={valores.password}
          onChange={mudar}
        />
        <button
          className="btn btn-primary w-100 mt-1"
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </>
  );
}
