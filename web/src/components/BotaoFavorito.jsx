import { Link, useLocation } from 'react-router';
import Icone from './Icone.jsx';
import { useFavoritos } from '../hooks/useFavoritos.js';
import { useSessao } from '../hooks/useSessao.js';

// O coração para pôr um produtor nos favoritos, ou tirá-lo. É um botão de alternar (aria-pressed):
// o nome não muda, e o leitor de ecrã diz se está premido. Quem não tem sessão vai para a entrada e
// volta a esta página depois de entrar. O administrador (que não compra) e o próprio produtor não
// veem o coração. Com "comTexto", mostra também a palavra "Favorito" (na página do produtor); o
// nome para os leitores de ecrã contém sempre a palavra que se vê.
export default function BotaoFavorito({ produtor, comTexto = false }) {
  const { utilizador } = useSessao();
  const { eFavorito, alternar } = useFavoritos();
  const { pathname, search } = useLocation();
  const nome = `Guardar ${produtor.nomeExploracao} nos favoritos`;
  const classe = `botao-favorito ${comTexto ? 'botao-favorito-texto' : ''}`;

  if (utilizador?.papel === 'admin' || utilizador?.id === produtor.id) {
    return null;
  }

  if (!utilizador) {
    return (
      <Link
        className={classe}
        to="/entrar"
        state={{ depois: pathname + search }}
        aria-label={nome}
        title={nome}
        viewTransition
      >
        <Icone nome="favorito" tamanho={22} />
        {comTexto && 'Favorito'}
      </Link>
    );
  }

  const favorito = eFavorito(produtor.id);
  return (
    <button
      className={`${classe} ${favorito ? 'botao-favorito-ativo' : ''}`}
      type="button"
      aria-pressed={favorito}
      aria-label={nome}
      title={nome}
      // Se o pedido falhar, o coração volta sozinho ao que estava (FavoritosProvider)
      onClick={() => alternar(produtor.id).catch(() => {})}
    >
      <Icone nome="favorito" cheio={favorito} tamanho={22} />
      {comTexto && 'Favorito'}
    </button>
  );
}
