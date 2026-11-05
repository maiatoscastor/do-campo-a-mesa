import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import Icone from './Icone.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarPreco } from '../produtos.js';

// Quanto tempo cada aviso fica no ecrã, e quantos se mostram de cada vez
const DURACAO = 8000;
const MAXIMO = 3;

// O que o produtor fez à encomenda, visto pelo comprador
const MUDANCAS = {
  confirmada: 'confirmou a sua encomenda',
  pronta: 'tem a sua encomenda pronta',
  entregue: 'marcou a sua encomenda como entregue',
};

let proximoId = 0;

// Os avisos em tempo real que chegam pela sala pessoal de quem tem a sessão (encomendas, leilões e
// validação da conta). Aparecem no canto do ecrã, em qualquer página, e desaparecem sozinhos. São
// anunciados aos leitores de ecrã (aria-live).
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

  useEventoSocket('encomenda-atualizada', ({ estado, produtor }) =>
    mostrar(
      `${produtor} ${MUDANCAS[estado] ?? `mudou a sua encomenda para ${estado}`}.`,
      { para: '/encomendas', texto: 'Ver encomendas' },
    ),
  );

  useEventoSocket('nova-encomenda', ({ comprador, total }) =>
    mostrar(`Nova encomenda de ${comprador}: ${formatarPreco(total)}.`, {
      para: '/conta/encomendas',
      texto: 'Ver encomendas',
    }),
  );

  useEventoSocket('leilao-ganho', ({ nome, lote, valor }) =>
    mostrar(
      `Ganhou o leilão de ${nome} (${lote}) por ${formatarPreco(valor)}.`,
      { para: '/encomendas', texto: 'Ver a encomenda' },
    ),
  );

  useEventoSocket('leilao-terminado', ({ nome, vencedor, valor }) =>
    mostrar(
      vencedor
        ? `O seu leilão de ${nome} terminou: vendido a ${vencedor} por ${formatarPreco(valor)}.`
        : `O seu leilão de ${nome} terminou sem licitações.`,
      { para: '/conta/leiloes', texto: 'Ver leilões' },
    ),
  );

  // A conta muda (por exemplo, o produtor passa a poder publicar): lê-se outra vez do servidor
  useEventoSocket('conta-validada', ({ aprovado }) => {
    atualizar().catch(() => {});
    mostrar(
      aprovado
        ? 'A sua conta de produtor foi aprovada. Já pode publicar produtos e leilões.'
        : 'A sua conta de produtor não foi aprovada.',
      { para: '/conta/quinta', texto: 'Ver a conta' },
    );
  });

  return (
    <div className="avisos" role="status" aria-live="polite">
      {avisos.map(({ id, texto, ligacao }) => (
        <div className="aviso" key={id}>
          <Icone nome="sino" tamanho={20} className="aviso-icone" />
          <p className="mb-0">
            {texto}{' '}
            <Link to={ligacao.para} onClick={() => fechar(id)}>
              {ligacao.texto}
            </Link>
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
