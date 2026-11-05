import { useContext } from 'react';
import { CarrinhoContext } from '../context/carrinho.js';

// Dá acesso ao carrinho em qualquer componente: const { linhas, definir } = useCarrinho();
export function useCarrinho() {
  return useContext(CarrinhoContext);
}
