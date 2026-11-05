import { useContext } from 'react';
import { SocketContext } from '../context/socket.js';

// Dá acesso à ligação Socket.io: const { socket, comSessao } = useSocket();
export function useSocket() {
  return useContext(SocketContext);
}
