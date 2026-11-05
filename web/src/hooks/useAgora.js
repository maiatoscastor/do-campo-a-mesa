import { useEffect, useState } from 'react';

// A hora atual, em milissegundos, atualizada duas vezes por segundo (para as contagens decrescentes).
// "diferenca" é quanto o relógio do servidor está à frente do deste dispositivo: somando-a, todos os
// compradores veem o mesmo tempo, mesmo com o relógio do telemóvel ou do computador acertado mal.
export function useAgora(diferenca = 0) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(relogio);
  }, []);

  return agora + diferenca;
}
