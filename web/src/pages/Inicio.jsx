import { Link } from 'react-router';
import { useSessao } from '../hooks/useSessao.js';

// Página inicial: é aqui que a aplicação abre, com ou sem sessão. Só diz o que a aplicação é: os
// destaques (leilão em direto, produtos da época) entram quando houver dados reais para mostrar.
export default function Inicio() {
  const { utilizador } = useSessao();

  return (
    <>
      <title>Do Campo à Mesa</title>
      {utilizador?.produtor?.validacao === 'pendente' && (
        <div className="alert alert-warning" role="status">
          A sua conta de produtor está à espera de validação.{' '}
          <Link className="alert-link" to="/conta/quinta">
            Ver a conta
          </Link>
        </div>
      )}
      <h1>Produtos do Alto Minho, diretamente de quem os produz</h1>
      <p className="text-body-secondary">
        Encomende a produtores locais, levante na quinta ou receba em casa, e
        licite em leilões em direto.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/produtos">
          Ver produtos
        </Link>
        <Link className="btn btn-suave" to="/leiloes">
          Ver leilões
        </Link>
      </div>
    </>
  );
}
