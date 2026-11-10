import ListaNotificacoes from '../components/ListaNotificacoes.jsx';
import { useListaNotificacoes } from '../hooks/useListaNotificacoes.js';

// As notificações em página inteira: é o que o sino abre no telemóvel (no computador abre um painel)
export default function Notificacoes() {
  const { notificacoes, erro } = useListaNotificacoes();

  return (
    <>
      <title>Notificações · Do Campo à Mesa</title>
      <h1 className="mb-3">Notificações</h1>
      <div className="card overflow-hidden">
        <ListaNotificacoes notificacoes={notificacoes} erro={erro} />
      </div>
    </>
  );
}
