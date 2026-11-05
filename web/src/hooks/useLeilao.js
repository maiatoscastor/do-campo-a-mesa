import { useCallback, useEffect, useState } from 'react';
import { useSocket } from './useSocket.js';

// Liga uma página à sala de um leilão: entra na sala, mantém o estado atualizado com cada evento do
// servidor e sai da sala ao mudar de página. Cada socket.on tem o seu socket.off na limpeza; sem
// isso, os eventos ficavam a dobrar ao voltar à página.
export function useLeilao(id) {
  const { socket, comSessao } = useSocket();
  const [leilao, setLeilao] = useState(null);
  const [licitacoes, setLicitacoes] = useState([]);
  const [participantes, setParticipantes] = useState(0);
  // Quanto o relógio do servidor está à frente do deste dispositivo
  const [diferenca, setDiferenca] = useState(0);
  const [ligado, setLigado] = useState(socket.connected);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const entrar = () => {
      setLigado(true);
      socket.emit('entrar', id);
    };
    const aoDesligar = () => setLigado(false);
    const aoEstado = ({ agora, leilao: atual, licitacoes: lista }) => {
      setDiferenca(new Date(agora).getTime() - Date.now());
      setLeilao(atual);
      setLicitacoes(lista);
      setErro('');
    };
    // As mensagens podem chegar fora de ordem: o leilão só avança (pelo número de licitações), e o
    // histórico fica sempre pela ordem em que as licitações foram aceites
    const aoLicitar = ({ licitacao, ...mudancas }) => {
      setLeilao((atual) =>
        atual && mudancas.numeroDeLicitacoes > atual.numeroDeLicitacoes
          ? { ...atual, ...mudancas }
          : atual,
      );
      setLicitacoes((lista) =>
        [licitacao, ...lista.filter(({ id: outro }) => outro !== licitacao.id)]
          .sort((a, b) => b.ordem - a.ordem)
          .slice(0, 20),
      );
    };
    const aoAbrir = () =>
      setLeilao((atual) => atual && { ...atual, estado: 'ativo' });
    const aoTerminar = () =>
      setLeilao((atual) => atual && { ...atual, estado: 'terminado' });

    // Se a ligação cair e voltar, o cliente volta a entrar na sala e recebe o estado de novo
    socket.on('connect', entrar);
    socket.on('disconnect', aoDesligar);
    socket.on('estado', aoEstado);
    socket.on('nova-licitacao', aoLicitar);
    socket.on('presenca', setParticipantes);
    socket.on('recusada', setErro);
    socket.on('aberto', aoAbrir);
    socket.on('terminado', aoTerminar);
    if (socket.connected) {
      entrar();
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('sair', id);
      socket.off('connect', entrar);
      socket.off('disconnect', aoDesligar);
      socket.off('estado', aoEstado);
      socket.off('nova-licitacao', aoLicitar);
      socket.off('presenca', setParticipantes);
      socket.off('recusada', setErro);
      socket.off('aberto', aoAbrir);
      socket.off('terminado', aoTerminar);
      // Um visitante só estava ligado por causa do leilão: ao sair da página, desliga
      if (!comSessao) {
        socket.disconnect();
      }
    };
  }, [socket, comSessao, id]);

  // Envia uma licitação e devolve a resposta do servidor: { ok: true } ou { ok: false, erro }
  const licitar = useCallback(
    (valor) =>
      socket
        .timeout(10000)
        .emitWithAck('licitar', { leilaoId: id, valor })
        .catch(() => ({
          ok: false,
          erro: 'Sem resposta do servidor. Tente novamente.',
        })),
    [socket, id],
  );

  return {
    leilao,
    licitacoes,
    participantes,
    diferenca,
    ligado,
    erro,
    licitar,
  };
}
