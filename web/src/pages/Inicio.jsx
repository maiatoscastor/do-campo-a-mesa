import { Link } from 'react-router';
import DestaqueLeilao from '../components/DestaqueLeilao.jsx';
import EncomendasEmCurso from '../components/EncomendasEmCurso.jsx';
import InicioAdministrador from '../components/InicioAdministrador.jsx';
import InicioProdutor from '../components/InicioProdutor.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { primeiroNome } from '../utilizador.js';

// Página inicial: é aqui que a aplicação abre, com ou sem sessão, e cada perfil vê o mínimo que lhe
// interessa. O visitante e o comprador veem o que a aplicação é e o leilão em destaque (o comprador
// também as encomendas em curso); o produtor e o administrador, o que precisa da atenção deles.
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
      {utilizador && (
        <p className="h4 mb-3">Olá, {primeiroNome(utilizador.nome)}</p>
      )}
      {/* No computador, o leilão em destaque fica ao lado da apresentação; no telemóvel, por baixo */}
      <div className="inicio-topo">
        <div>
          <h1>Produtos do Alto Minho, diretamente de quem os produz</h1>
          <p className="text-body-secondary">
            Encomende a produtores locais, levante na quinta ou receba em casa,
            e licite em leilões em direto.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Link className="btn btn-primary" to="/produtos">
              Ver produtos
            </Link>
            <Link className="btn btn-suave" to="/leiloes">
              Ver leilões
            </Link>
          </div>
          {papel === 'comprador' && <EncomendasEmCurso />}
        </div>
        <DestaqueLeilao />
      </div>
    </>
  );
}
