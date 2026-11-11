import { useContext } from 'react';
import { TarefasAdminContext } from '../context/tarefasAdmin.js';

// O que está à espera do administrador: { produtoresPorValidar, denunciasPorDecidir (de avaliações e
// de produtores), denunciasDeAvaliacoes, denunciasDeProdutores, total, recontar }. Os números ficam a
// null enquanto não se sabem, e sempre a null para quem não é administrador.
export function useTarefasAdmin() {
  return useContext(TarefasAdminContext);
}
