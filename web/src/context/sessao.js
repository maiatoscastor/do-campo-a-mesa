import { createContext } from 'react';

// O contexto fica num ficheiro à parte do componente que o preenche (SessaoProvider.jsx), porque o
// recarregamento automático do Vite só funciona em ficheiros que exportam apenas componentes.
export const SessaoContext = createContext(null);
