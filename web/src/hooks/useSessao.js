import { useContext } from 'react';
import { SessaoContext } from '../context/sessao.js';

// Dá acesso à sessão em qualquer componente: const { utilizador, sair } = useSessao();
export function useSessao() {
  return useContext(SessaoContext);
}
