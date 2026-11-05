import { useCallback, useEffect, useMemo, useState } from 'react';
import { CarrinhoContext } from './carrinho.js';

const CHAVE = 'do-campo-a-mesa:carrinho';

// Como a sessão, o carrinho funciona mesmo que o browser bloqueie o armazenamento: dura só até a
// página ser fechada
function lerCarrinhoGuardado() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(guardado) ? guardado : [];
  } catch {
    return [];
  }
}

function guardarCarrinho(linhas) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(linhas));
  } catch {
    // Sem armazenamento, o carrinho fica só na memória
  }
}

// O carrinho, acessível a toda a aplicação (estado global). Cada linha é { produto, quantidade }, com
// os dados do produto de quando foi escolhido. Fica guardado no browser e funciona sem conta: a conta
// só é pedida ao encomendar. Os preços que contam são sempre os do servidor.
export default function CarrinhoProvider({ children }) {
  const [linhas, setLinhas] = useState(lerCarrinhoGuardado);

  useEffect(() => guardarCarrinho(linhas), [linhas]);

  // Mudar o carrinho num separador muda-o nos outros
  useEffect(() => {
    function aoMudarNoutroSeparador(evento) {
      if (evento.key === CHAVE) {
        setLinhas(lerCarrinhoGuardado());
      }
    }
    window.addEventListener('storage', aoMudarNoutroSeparador);
    return () => window.removeEventListener('storage', aoMudarNoutroSeparador);
  }, []);

  // Põe a quantidade de um produto, sem passar do stock; com 0, tira-o do carrinho. Um produto que já
  // lá está fica no mesmo sítio da lista.
  const definir = useCallback((produto, quantidade) => {
    const nova = Math.min(Math.max(quantidade, 0), produto.stock);
    setLinhas((atuais) => {
      const sem = atuais.filter((linha) => linha.produto.id !== produto.id);
      if (nova === 0) {
        return sem;
      }
      const linha = { produto, quantidade: nova };
      return sem.length === atuais.length
        ? [...atuais, linha]
        : atuais.map((l) => (l.produto.id === produto.id ? linha : l));
    });
  }, []);

  // Troca os dados guardados pelos atuais (o preço e o stock podem ter mudado no servidor)
  const renovar = useCallback((produtos) => {
    setLinhas((atuais) =>
      atuais.map((linha) => ({
        ...linha,
        produto:
          produtos.find(({ id }) => id === linha.produto.id) ?? linha.produto,
      })),
    );
  }, []);

  // Tira estes produtos do carrinho (por exemplo, depois de os encomendar)
  const retirar = useCallback((ids) => {
    setLinhas((atuais) =>
      atuais.filter((linha) => !ids.includes(linha.produto.id)),
    );
  }, []);

  const valor = useMemo(
    () => ({
      linhas,
      quantidadeDe: (id) =>
        linhas.find((linha) => linha.produto.id === id)?.quantidade ?? 0,
      definir,
      renovar,
      retirar,
    }),
    [linhas, definir, renovar, retirar],
  );

  return (
    <CarrinhoContext.Provider value={valor}>
      {children}
    </CarrinhoContext.Provider>
  );
}
