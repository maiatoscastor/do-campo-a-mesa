import { useEffect, useEffectEvent } from 'react';
import { useSocket } from './useSocket.js';

// Corre "tratar" sempre que o servidor envia este evento, enquanto o componente estiver no ecrã. O
// useEffectEvent dá sempre a versão mais recente de "tratar", sem voltar a subscrever o evento a
// cada desenho; o socket.off na limpeza evita avisos a dobrar ao mudar de página.
export function useEventoSocket(evento, tratar) {
  const { socket } = useSocket();
  const aoReceber = useEffectEvent(tratar);

  useEffect(() => {
    const ouvir = (dados) => aoReceber(dados);
    socket.on(evento, ouvir);
    return () => socket.off(evento, ouvir);
  }, [socket, evento]);
}
