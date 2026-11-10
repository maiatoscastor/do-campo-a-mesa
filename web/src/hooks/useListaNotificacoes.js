import { useEffect, useState } from 'react';
import { useEventoSocket } from './useEventoSocket.js';
import { useNotificacoes } from './useNotificacoes.js';
import { useSessao } from './useSessao.js';

// As notificações de quem tem a sessão, para a página e para o painel do cabeçalho. Ao abrir, ficam
// todas lidas; as que chegam com a lista aberta aparecem logo no topo.
export function useListaNotificacoes() {
  const { pedir } = useSessao();
  const { marcarComoLidas } = useNotificacoes();
  const [notificacoes, setNotificacoes] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let cancelado = false;
    pedir('/notifications')
      .then((dados) => {
        if (!cancelado) {
          setNotificacoes(dados.notificacoes);
          marcarComoLidas();
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, marcarComoLidas]);

  useEventoSocket('notificacao', (nova) => {
    setNotificacoes((lista) => lista && [nova, ...lista]);
    marcarComoLidas();
  });

  return { notificacoes, erro };
}
