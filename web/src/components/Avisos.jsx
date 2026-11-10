import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import Icone from './Icone.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';

// Quanto tempo cada aviso fica no ecrã, e quantos se mostram de cada vez
const DURACAO = 8000;
const MAXIMO = 3;

let proximoId = 0;

// As notificações que chegam em tempo real pela sala pessoal de quem tem a sessão (encomendas,
// leilões e validação da conta). Aparecem no canto do ecrã, em qualquer página, e desaparecem
// sozinhas; continuam guardadas na página Notificações. São anunciadas aos leitores de ecrã.
export default function Avisos() {
  const { atualizar } = useSessao();
  const [avisos, setAvisos] = useState([]);

  const fechar = useCallback((id) => {
    setAvisos((lista) => lista.filter((aviso) => aviso.id !== id));
  }, []);

  const mostrar = useCallback(
    (texto, ligacao) => {
      proximoId += 1;
      const id = proximoId;
      setAvisos((lista) => [
        ...lista.slice(1 - MAXIMO),
        { id, texto, ligacao },
      ]);
      setTimeout(() => fechar(id), DURACAO);
    },
    [fechar],
  );

  // O texto e a página vêm do servidor, que também guarda a notificação para se ver mais tarde
  useEventoSocket('notificacao', ({ texto, ligacao }) =>
    mostrar(texto, ligacao),
  );

  // A conta muda (por exemplo, o produtor passa a poder publicar): lê-se outra vez do servidor
  useEventoSocket('conta-validada', () => atualizar().catch(() => {}));

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map(({ id, texto, ligacao }) => (
        <div className="aviso" key={id}>
          <Icone nome="sino" tamanho={20} className="aviso-icone" />
          <p className="mb-0">
            {texto}{' '}
            {ligacao && (
              <Link to={ligacao} onClick={() => fechar(id)}>
                Ver
              </Link>
            )}
          </p>
          <button
            className="aviso-fechar"
            type="button"
            aria-label="Fechar aviso"
            onClick={() => fechar(id)}
          >
            <Icone nome="fechar" tamanho={20} />
          </button>
        </div>
      ))}
    </div>
  );
}
