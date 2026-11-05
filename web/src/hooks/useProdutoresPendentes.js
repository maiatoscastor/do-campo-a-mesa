import { useCallback, useEffect, useState } from 'react';
import { useSessao } from './useSessao.js';

// Quantos produtores esperam validação, só para o administrador. Devolve o número (null enquanto não
// se sabe) e uma função para voltar a contar, por exemplo depois de aprovar um.
export function useProdutoresPendentes() {
  const { utilizador, pedir } = useSessao();
  const eAdministrador = utilizador?.papel === 'admin';
  const [numero, setNumero] = useState(null);

  const recontar = useCallback(
    () =>
      pedir('/admin/produtores/pendentes')
        .then((lista) => setNumero(lista.length))
        .catch(() => {}),
    [pedir],
  );

  useEffect(() => {
    if (eAdministrador) {
      recontar();
    }
  }, [eAdministrador, recontar]);

  return [eAdministrador ? numero : null, recontar];
}
