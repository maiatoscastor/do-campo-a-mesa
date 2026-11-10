import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { TarefasAdminContext } from './tarefasAdmin.js';

// Os números do que espera pelo administrador (produtores por validar e avaliações denunciadas por
// decidir), para toda a aplicação: a navegação, os separadores da administração e o início leem
// todos daqui, com um só pedido. Voltam a ser lidos quando o servidor avisa que mudaram (um produtor
// novo, uma denúncia nova, ou a decisão de outro administrador) e depois de cada decisão.
export default function TarefasAdminProvider({ children }) {
  const { utilizador, token, pedir } = useSessao();
  const eAdministrador = utilizador?.papel === 'admin';
  // Os números ficam guardados com o token a que pertencem, como no sino
  const [resumo, setResumo] = useState({ token: null });

  const recontar = useCallback(
    () =>
      pedir('/admin/resumo')
        .then((dados) => setResumo({ token, ...dados }))
        .catch(() => {}),
    [pedir, token],
  );

  useEffect(() => {
    if (eAdministrador) {
      recontar();
    }
  }, [eAdministrador, recontar]);

  useEventoSocket('produtores-mudaram', () => eAdministrador && recontar());
  useEventoSocket('denuncias-mudaram', () => eAdministrador && recontar());

  const valor = useMemo(() => {
    const atual = eAdministrador && resumo.token === token ? resumo : {};
    const produtoresPorValidar = atual.produtoresPorValidar ?? null;
    const denunciasPorDecidir = atual.denunciasPorDecidir ?? null;
    return {
      produtoresPorValidar,
      denunciasPorDecidir,
      total: (produtoresPorValidar ?? 0) + (denunciasPorDecidir ?? 0),
      recontar,
    };
  }, [eAdministrador, resumo, token, recontar]);

  return (
    <TarefasAdminContext.Provider value={valor}>
      {children}
    </TarefasAdminContext.Provider>
  );
}
