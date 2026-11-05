import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { ENDERECO_API } from '../api/cliente.js';
import { useSessao } from '../hooks/useSessao.js';
import { SocketContext } from './socket.js';

// Uma só ligação Socket.io para toda a aplicação, refeita quando a sessão muda (o token vai na
// ligação, e é com ele que o servidor sabe quem licita). Com sessão, fica ligada, para os avisos em
// tempo real; sem sessão, só liga quando é precisa, por exemplo, para assistir a um leilão.
export default function SocketProvider({ children }) {
  const { token } = useSessao();

  // forceNew: cada sessão tem a sua ligação; sem ele, o cliente reaproveitava a anterior, com o
  // token antigo
  const socket = useMemo(
    () =>
      io(ENDERECO_API || undefined, {
        auth: token ? { token } : {},
        autoConnect: false,
        forceNew: true,
      }),
    [token],
  );

  useEffect(() => {
    if (token) {
      socket.connect();
    }
    return () => socket.disconnect();
  }, [socket, token]);

  const valor = useMemo(
    () => ({ socket, comSessao: Boolean(token) }),
    [socket, token],
  );

  return (
    <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>
  );
}
