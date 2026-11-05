import { useEffect, useState } from 'react';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import CartaoEncomenda from '../components/CartaoEncomenda.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { estadoSeguinte } from '../encomendas.js';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';

// As encomendas feitas ao produtor com sessão. Em cada uma, um botão passa-a ao estado seguinte
// (confirmar, marcar como pronta, marcar como entregue).
export default function EncomendasRecebidas() {
  const { pedir } = useSessao();
  const [encomendas, setEncomendas] = useState(null);
  const [erro, setErro] = useState(null);
  const [aMudar, setAMudar] = useState(null);

  // Muda para voltar a pedir a lista ao servidor
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let cancelado = false;
    pedir('/orders/recebidas')
      .then((lista) => !cancelado && setEncomendas(lista))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, versao]);

  // Uma encomenda nova (da loja ou de um leilão que acabou) aparece sem recarregar a página
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('nova-encomenda', recarregar);
  useEventoSocket('leilao-terminado', recarregar);

  async function avancar(encomenda, estado) {
    setErro(null);
    setAMudar(encomenda.id);
    try {
      const atualizada = await pedir(`/orders/${encomenda.id}/estado`, {
        metodo: 'PATCH',
        corpo: { estado },
      });
      setEncomendas((lista) =>
        lista.map((e) => (e.id === atualizada.id ? atualizada : e)),
      );
    } catch (problema) {
      setErro(problema);
    } finally {
      setAMudar(null);
    }
  }

  return (
    <>
      <title>Encomendas recebidas · Do Campo à Mesa</title>
      <h1 className="mb-3">Encomendas recebidas</h1>
      <AlertaDeErro erro={erro} />
      {encomendas === null && !erro && (
        <p className="text-body-secondary">A carregar…</p>
      )}

      {encomendas?.length === 0 && (
        <EstadoVazio
          icone="encomendas"
          titulo="Ainda não recebeu encomendas"
          texto="As encomendas dos seus produtos aparecem aqui."
        />
      )}

      {encomendas?.map((encomenda) => {
        const seguinte = estadoSeguinte(encomenda.estado);
        return (
          <CartaoEncomenda
            key={encomenda.id}
            encomenda={encomenda}
            para="produtor"
          >
            {seguinte && (
              <button
                className="btn btn-primary btn-sm mt-3"
                type="button"
                disabled={aMudar === encomenda.id}
                onClick={() => avancar(encomenda, seguinte.estado)}
              >
                {seguinte.acao}
              </button>
            )}
          </CartaoEncomenda>
        );
      })}
    </>
  );
}
