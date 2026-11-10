import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import CartaoEncomenda from '../components/CartaoEncomenda.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';

// As encomendas que quem tem a sessão fez, das mais recentes para as mais antigas, e o estado de cada
// uma. Logo a seguir a encomendar, mostra a confirmação.
export default function Encomendas() {
  const { pedir } = useSessao();
  const { state } = useLocation();
  const [encomendas, setEncomendas] = useState(null);
  const [erro, setErro] = useState(null);

  // Muda para voltar a pedir a lista ao servidor
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let cancelado = false;
    pedir('/orders')
      .then((lista) => !cancelado && setEncomendas(lista))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, versao]);

  // Quando o produtor muda o estado (ou se ganha um leilão), a lista atualiza-se sozinha
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('encomenda-atualizada', recarregar);
  useEventoSocket('leilao-ganho', recarregar);

  let confirmacao = '';
  if (state?.avaliada) {
    confirmacao = 'Obrigado pela avaliação.';
  } else if (state?.feitas === 1) {
    confirmacao = 'Encomenda feita. O produtor vai confirmá-la.';
  } else if (state?.feitas > 1) {
    confirmacao = `Foram feitas ${state.feitas} encomendas, uma por produtor.`;
  }

  return (
    <>
      <title>Encomendas · Do Campo à Mesa</title>
      <h1 className="mb-3">Encomendas</h1>
      {confirmacao && (
        <div className="alert alert-success" role="status">
          {confirmacao}
        </div>
      )}
      <AlertaDeErro erro={erro} />
      {encomendas === null && !erro && (
        <p className="text-body-secondary">A carregar…</p>
      )}

      {encomendas?.length === 0 && (
        <EstadoVazio
          icone="encomendas"
          titulo="Ainda não há encomendas"
          texto="As suas encomendas e o estado de cada uma aparecem aqui."
        >
          <Link className="btn btn-primary" to="/produtos">
            Ver produtos
          </Link>
        </EstadoVazio>
      )}

      {encomendas?.map((encomenda) => (
        <CartaoEncomenda
          key={encomenda.id}
          encomenda={encomenda}
          para="comprador"
        />
      ))}
    </>
  );
}
