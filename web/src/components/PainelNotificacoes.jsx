import { useEffect, useRef } from 'react';
import ListaNotificacoes from './ListaNotificacoes.jsx';
import { useListaNotificacoes } from '../hooks/useListaNotificacoes.js';

// O painel que o sino abre no computador, por baixo dele. Só existe enquanto está aberto: ao abrir,
// lê as notificações e marca-as como lidas. Fecha com a tecla Escape, ao clicar fora ou ao escolher
// uma notificação ("fechar"); o foco passa para o painel ao abrir.
export default function PainelNotificacoes({ id, fechar, zona }) {
  const { notificacoes, erro } = useListaNotificacoes();
  const painel = useRef(null);

  useEffect(() => {
    painel.current?.focus();
    function aoTeclar(evento) {
      if (evento.key === 'Escape') {
        fechar(true);
      }
    }
    // "zona" é o sino e o painel: um clique fora deles fecha
    function aoClicar(evento) {
      if (!zona.current?.contains(evento.target)) {
        fechar(false);
      }
    }
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicar);
    };
  }, [fechar, zona]);

  return (
    <section
      className="painel-notificacoes"
      id={id}
      ref={painel}
      tabIndex={-1}
      aria-labelledby={`${id}-titulo`}
    >
      <h2 className="painel-notificacoes-titulo" id={`${id}-titulo`}>
        Notificações
      </h2>
      <ListaNotificacoes
        notificacoes={notificacoes}
        erro={erro}
        aoEscolher={() => fechar(false)}
      />
    </section>
  );
}
