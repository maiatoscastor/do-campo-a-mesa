import { useContext } from 'react';
import { NotificacoesContext } from '../context/notificacoes.js';

// Dá acesso ao número de notificações por ler: const { porLer, marcarComoLidas } = useNotificacoes();
export function useNotificacoes() {
  return useContext(NotificacoesContext);
}
