import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { NotificacoesContext } from './notificacoes.js';

// Quantas notificações estão por ler (o número no sino), para toda a aplicação. Lê-se do servidor
// ao entrar e soma-se uma a cada notificação que chega em tempo real.
export default function NotificacoesProvider({ children }) {
  const { token, pedir } = useSessao();
  // O número fica guardado com o token a que pertence: ao terminar a sessão ou mudar de conta, o
  // número antigo deixa de contar
  const [contagem, setContagem] = useState({ token: null, porLer: 0 });
  const porLer = contagem.token === token ? contagem.porLer : 0;

  useEffect(() => {
    if (!token) {
      return undefined;
    }
    let cancelado = false;
    pedir('/notifications')
      .then(
        (dados) => !cancelado && setContagem({ token, porLer: dados.porLer }),
      )
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [token, pedir]);

  useEventoSocket('notificacao', () =>
    setContagem((atual) => ({
      token,
      porLer: (atual.token === token ? atual.porLer : 0) + 1,
    })),
  );

  // Ao abrir a lista, ficam todas lidas (no ecrã logo, e no servidor a seguir)
  const marcarComoLidas = useCallback(() => {
    setContagem({ token, porLer: 0 });
    return pedir('/notifications/lidas', { metodo: 'PATCH' }).catch(() => {});
  }, [pedir, token]);

  const valor = useMemo(
    () => ({ porLer, marcarComoLidas }),
    [porLer, marcarComoLidas],
  );

  return (
    <NotificacoesContext.Provider value={valor}>
      {children}
    </NotificacoesContext.Provider>
  );
}
