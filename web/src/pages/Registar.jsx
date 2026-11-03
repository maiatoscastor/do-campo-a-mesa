import { Navigate, useLocation } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import CampoPassword from '../components/CampoPassword.jsx';
import Ilustracao from '../components/Ilustracao.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { LOCALIDADES } from '../localidades.js';

const TIPOS_DE_CONTA = [
  {
    valor: 'comprador',
    titulo: 'Quero comprar',
    texto: 'Encomendar e licitar',
    ilustracao: 'cesto',
  },
  {
    valor: 'produtor',
    titulo: 'Quero vender',
    texto: 'Depois de validada a conta',
    ilustracao: 'caixa',
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

  // Ao criar a conta, a sessão muda e o componente volta a ser desenhado: é aqui que segue em frente
  if (utilizador) {
    return <Navigate to={state?.depois ?? '/'} replace />;
  }

  function submeter(evento) {
    evento.preventDefault();
    enviar(() => registar(valores));
  }

  return (
    <>
      <title>Criar conta · Do Campo à Mesa</title>
      <h1>Criar a sua conta</h1>
      <AlertaDeErro erro={erro} />
      <form ref={formulario} onSubmit={submeter} noValidate>
        <fieldset className="mb-3">
          <legend className="form-label">Tipo de conta</legend>
          <div className="row row-cols-2 g-2">
            {TIPOS_DE_CONTA.map(({ valor, titulo, texto, ilustracao }) => (
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
                  <Ilustracao nome={ilustracao} className="opcao-ilustracao" />
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
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={valores.email}
          onChange={mudar}
          erro={detalhes.email}
        />
        <CampoPassword
          rotulo="Password"
          nome="password"
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
          className="btn btn-primary w-100 mt-1"
          type="submit"
          disabled={aEnviar}
        >
          {aEnviar ? 'A criar a conta…' : 'Criar conta'}
        </button>
      </form>
    </>
  );
}
