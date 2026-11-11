import { useContext } from 'react';
import { FavoritosContext } from '../context/favoritos.js';

// Os produtores favoritos de quem tem a sessão: { podeTer, eFavorito(id), alternar(id) }.
// "podeTer" é falso para os visitantes e para o administrador (que não compra).
export function useFavoritos() {
  return useContext(FavoritosContext);
}
