import InicioAdministrador from '../components/InicioAdministrador.jsx';
import InicioLoja from '../components/InicioLoja.jsx';
import InicioProdutor from '../components/InicioProdutor.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { primeiroNome } from '../utilizador.js';

// Página inicial: é aqui que a aplicação abre, com ou sem sessão, e cada perfil vê o que lhe
// interessa. O visitante e o comprador veem a loja (a pesquisa, o leilão em destaque, as
// categorias, os produtos da época, os leilões e os produtores; o comprador também as encomendas);
// o produtor e o administrador, o que precisa da atenção deles.
export default function Inicio() {
  const { utilizador } = useSessao();
  const papel = utilizador?.papel;

  if (papel === 'produtor' || papel === 'admin') {
    return (
      <>
        <title>Do Campo à Mesa</title>
        <h1 className="mb-1">Olá, {primeiroNome(utilizador.nome)}</h1>
        <p className="text-body-secondary mb-4">
          {papel === 'produtor'
            ? `${utilizador.produtor?.nomeExploracao ?? 'A sua quinta'}: o que precisa da sua atenção.`
            : 'O que espera por si na administração.'}
        </p>
        {papel === 'produtor' ? <InicioProdutor /> : <InicioAdministrador />}
      </>
    );
  }

  return (
    <>
      <title>Do Campo à Mesa</title>
      <InicioLoja />
    </>
  );
}
