import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSessao } from '../hooks/useSessao.js';
import { FavoritosContext } from './favoritos.js';

const NENHUM = new Set();

// Os produtores que a pessoa com sessão tem nos favoritos, para toda a aplicação: os corações dos
// cartões e da página de cada produtor leem todos daqui, com um só pedido. Tocar num coração muda
// logo o ecrã e só depois pede à API; se o pedido falhar, o coração volta ao que estava.
export default function FavoritosProvider({ children }) {
  const { utilizador, token, pedir } = useSessao();
  const podeTer = Boolean(utilizador) && utilizador.papel !== 'admin';
  // Os favoritos ficam guardados com o token a que pertencem, para nunca se verem os de outra sessão
  const [guardados, setGuardados] = useState({ token: null, ids: NENHUM });

  useEffect(() => {
    if (!podeTer) {
      return undefined;
    }
    let cancelado = false;
    pedir('/producers?favoritos=true')
      .then((lista) => {
        if (!cancelado) {
          setGuardados({ token, ids: new Set(lista.map(({ id }) => id)) });
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [podeTer, pedir, token]);

  const ids = podeTer && guardados.token === token ? guardados.ids : NENHUM;

  const marcar = useCallback(
    (id, favorito) =>
      setGuardados((atual) => {
        const novos = new Set(atual.token === token ? atual.ids : []);
        if (favorito) {
          novos.add(id);
        } else {
          novos.delete(id);
        }
        return { token, ids: novos };
      }),
    [token],
  );

  const alternar = useCallback(
    async (id) => {
      const era = ids.has(id);
      marcar(id, !era);
      try {
        await pedir(`/producers/${id}/favorito`, {
          metodo: era ? 'DELETE' : 'PUT',
        });
      } catch (erro) {
        marcar(id, era);
        throw erro;
      }
    },
    [ids, marcar, pedir],
  );

  const valor = useMemo(
    () => ({ podeTer, eFavorito: (id) => ids.has(id), alternar }),
    [podeTer, ids, alternar],
  );

  return (
    <FavoritosContext.Provider value={valor}>
      {children}
    </FavoritosContext.Provider>
  );
}
