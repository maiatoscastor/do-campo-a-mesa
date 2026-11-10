import { Link } from 'react-router';
import DestaqueLeilao from '../components/DestaqueLeilao.jsx';
import Icone from '../components/Icone.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';
import { primeiroNome } from '../utilizador.js';

// O texto por baixo de cada atalho do administrador
function textoDaEspera(numero, umaEspera, variasEsperam) {
  if (numero === null) {
    return 'A contar…';
  }
  if (numero === 0) {
    return 'Nada à espera';
  }
  return numero === 1 ? umaEspera : `${numero} ${variasEsperam}`;
}

// Página inicial: é aqui que a aplicação abre, com ou sem sessão. Só diz o que a aplicação é: os
// destaques (leilão em direto, produtos da época) entram quando houver dados reais para mostrar.
export default function Inicio() {
  const { utilizador } = useSessao();

  return (
    <>
      <title>Do Campo à Mesa</title>
      {utilizador && (
        <p className="h4 mb-3">Olá, {primeiroNome(utilizador.nome)}</p>
      )}
      {utilizador?.produtor?.validacao === 'pendente' && (
        <div className="alert alert-warning" role="status">
          A sua conta de produtor está à espera de validação.{' '}
          <Link className="alert-link" to="/conta/quinta">
            Ver a conta
          </Link>
        </div>
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
        </div>
        <DestaqueLeilao />
      </div>
      {/* Atalhos do administrador para o que espera por ele, mesmo quando não há nada */}
      {utilizador?.papel === 'admin' && <AtalhosDoAdministrador />}
    </>
  );
}

function AtalhosDoAdministrador() {
  const { produtoresPorValidar, denunciasPorDecidir } = useTarefasAdmin();
  const atalhos = [
    {
      caminho: '/admin/produtores',
      icone: 'validar',
      titulo: 'Produtores por validar',
      numero: produtoresPorValidar,
      texto: textoDaEspera(
        produtoresPorValidar,
        '1 à espera de validação',
        'à espera de validação',
      ),
    },
    {
      caminho: '/admin/denuncias',
      icone: 'denuncia',
      titulo: 'Denúncias por decidir',
      numero: denunciasPorDecidir,
      texto: textoDaEspera(
        denunciasPorDecidir,
        '1 avaliação denunciada',
        'avaliações denunciadas',
      ),
    },
  ];
  return (
    <div className="row row-cols-1 row-cols-md-2 g-3 mt-2">
      {atalhos.map(({ caminho, icone, titulo, numero, texto }) => (
        <div className="col" key={caminho}>
          <Link className="card cartao-atalho h-100" to={caminho}>
            <div className="card-body d-flex align-items-center gap-3">
              <span className="cartao-atalho-icone">
                <Icone nome={icone} />
              </span>
              <div className="flex-grow-1">
                <p className="fw-bold mb-0">{titulo}</p>
                <p className="small text-body-secondary mb-0">{texto}</p>
              </div>
              {numero > 0 && (
                <span className="contador" aria-hidden="true">
                  {numero}
                </span>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
