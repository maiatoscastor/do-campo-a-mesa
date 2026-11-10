import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente.js';
import CartaoLeilaoAoVivo from './CartaoLeilaoAoVivo.jsx';
import ImagemProduto from './ImagemProduto.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { faseDoLeilao, formatarDia, formatarHora } from '../leiloes.js';

// De quanto em quanto tempo a licitação atual é lida outra vez (a sala do leilão é que está em direto)
const ATUALIZAR = 20000;

// O leilão em destaque no início: o que está a decorrer e acaba primeiro ou, se não houver nenhum,
// o próximo da agenda. Sem leilões, não mostra nada.
export default function DestaqueLeilao() {
  const [leiloes, setLeiloes] = useState(null);
  const agora = useAgora();

  useEffect(() => {
    let cancelado = false;
    const ler = () =>
      api('/auctions')
        .then((lista) => !cancelado && setLeiloes(lista))
        .catch(() => {});
    ler();
    const relogio = setInterval(ler, ATUALIZAR);
    return () => {
      cancelado = true;
      clearInterval(relogio);
    };
  }, []);

  if (!leiloes) {
    return null;
  }
  const porFase = (fase, data) =>
    leiloes
      .filter((leilao) => faseDoLeilao(leilao, agora) === fase)
      .sort((a, b) => new Date(a[data]) - new Date(b[data]));
  const aDecorrer = porFase('ativo', 'terminaEm');
  const [proximo] = porFase('agendado', 'iniciaEm');

  if (aDecorrer.length > 0) {
    return (
      <section className="destaque-leilao" aria-labelledby="em-direto">
        <h2 className="destaque-leilao-titulo" id="em-direto">
          Em direto agora
        </h2>
        <CartaoLeilaoAoVivo leilao={aDecorrer[0]} agora={agora} />
        {aDecorrer.length > 1 && (
          <Link className="small d-inline-block mt-2" to="/leiloes">
            Mais {aDecorrer.length - 1}{' '}
            {aDecorrer.length === 2 ? 'leilão' : 'leilões'} a decorrer
          </Link>
        )}
      </section>
    );
  }

  if (proximo) {
    return (
      <section className="destaque-leilao" aria-labelledby="proximo-leilao">
        <h2 className="destaque-leilao-titulo" id="proximo-leilao">
          Próximo leilão
        </h2>
        <Link
          className="card cartao-atalho mw-100"
          to={`/leiloes/${proximo.id}`}
        >
          <div className="card-body d-flex align-items-center gap-3">
            <ImagemProduto produto={proximo} className="imagem-produto-mini" />
            <div className="lista-produtos-texto">
              <p className="fw-bold mb-0 text-truncate">
                {proximo.nome} · {proximo.lote}
              </p>
              <p className="small text-body-secondary mb-0">
                {formatarDia(proximo.iniciaEm)} às{' '}
                {formatarHora(proximo.iniciaEm)} ·{' '}
                {proximo.produtor.nomeExploracao}
              </p>
            </div>
          </div>
        </Link>
      </section>
    );
  }

  return null;
}
