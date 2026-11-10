import { Link } from 'react-router';
import DestaqueLeilao from '../components/DestaqueLeilao.jsx';
import Icone from '../components/Icone.jsx';
import { useProdutoresPendentes } from '../hooks/useProdutoresPendentes.js';
import { useSessao } from '../hooks/useSessao.js';
import { primeiroNome } from '../utilizador.js';

function textoDosPendentes(numero) {
  if (numero === null) {
    return 'A contar…';
  }
  if (numero === 0) {
    return 'Nenhum à espera';
  }
  return `${numero} à espera de validação`;
}

// Página inicial: é aqui que a aplicação abre, com ou sem sessão. Só diz o que a aplicação é: os
// destaques (leilão em direto, produtos da época) entram quando houver dados reais para mostrar.
export default function Inicio() {
  const { utilizador } = useSessao();
  const [pendentes] = useProdutoresPendentes();

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
      {/* Atalho do administrador para o que espera por ele, mesmo quando não há nada */}
      {utilizador?.papel === 'admin' && (
        <Link className="card cartao-atalho mt-4" to="/conta/produtores">
          <div className="card-body d-flex align-items-center gap-3">
            <span className="cartao-atalho-icone">
              <Icone nome="validar" />
            </span>
            <div className="flex-grow-1">
              <p className="fw-bold mb-0">Produtores por validar</p>
              <p className="small text-body-secondary mb-0">
                {textoDosPendentes(pendentes)}
              </p>
            </div>
            {pendentes > 0 && <span className="contador">{pendentes}</span>}
          </div>
        </Link>
      )}
    </>
  );
}
