import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente.js';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import CartaoLeilaoAoVivo from '../components/CartaoLeilaoAoVivo.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { faseDoLeilao, formatarDia, formatarHora } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

// Os próximos leilões agrupados por dia, pela ordem em que começam
function agruparPorDia(leiloes) {
  const dias = new Map();
  for (const leilao of leiloes) {
    const dia = formatarDia(leilao.iniciaEm);
    dias.set(dia, [...(dias.get(dia) ?? []), leilao]);
  }
  return [...dias];
}

// Os leilões: os que estão a decorrer, em destaque, e a agenda dos próximos, com o dia e a hora.
// Aberta a todos; para licitar é preciso entrar.
export default function Leiloes() {
  const [leiloes, setLeiloes] = useState(null);
  const [erro, setErro] = useState(null);
  const agora = useAgora();

  useEffect(() => {
    let cancelado = false;
    api('/auctions')
      .then((lista) => !cancelado && setLeiloes(lista))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, []);

  // A fase vem da hora: um leilão agendado passa a "a decorrer" sem recarregar a página
  const comFase = (leiloes ?? []).map((leilao) => ({
    leilao,
    fase: faseDoLeilao(leilao, agora),
  }));
  const aDecorrer = comFase.filter(({ fase }) => fase === 'ativo');
  const proximos = comFase
    .filter(({ fase }) => fase === 'agendado')
    .map(({ leilao }) => leilao);

  return (
    <>
      <title>Leilões · Do Campo à Mesa</title>
      <h1 className="mb-3">Leilões</h1>
      <AlertaDeErro erro={erro} />
      {leiloes === null && !erro && (
        <p className="text-body-secondary">A carregar…</p>
      )}

      {leiloes && aDecorrer.length === 0 && proximos.length === 0 && (
        <EstadoVazio
          icone="leiloes"
          titulo="Não há leilões marcados"
          texto="Os leilões a decorrer e os próximos, com o dia e a hora, aparecem aqui."
        />
      )}

      {aDecorrer.length > 0 && (
        <section className="mb-4" aria-labelledby="a-decorrer">
          <h2 className="h5 mb-3" id="a-decorrer">
            A decorrer
          </h2>
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            {aDecorrer.map(({ leilao }) => (
              <div className="col" key={leilao.id}>
                <CartaoLeilaoAoVivo leilao={leilao} agora={agora} />
              </div>
            ))}
          </div>
        </section>
      )}

      {proximos.length > 0 && (
        <section aria-labelledby="proximos">
          <h2 className="h5 mb-3" id="proximos">
            Próximos leilões
          </h2>
          {agruparPorDia(proximos).map(([dia, doDia]) => (
            <div className="mb-3" key={dia}>
              <h3 className="agenda-dia">{dia}</h3>
              <ul className="list-group">
                {doDia.map((leilao) => (
                  <li className="list-group-item" key={leilao.id}>
                    <Link
                      className="agenda-leilao"
                      to={`/leiloes/${leilao.id}`}
                    >
                      <time className="agenda-hora" dateTime={leilao.iniciaEm}>
                        {formatarHora(leilao.iniciaEm)}
                      </time>
                      <ImagemProduto
                        produto={leilao}
                        className="imagem-produto-mini"
                      />
                      <span className="lista-produtos-texto">
                        <span className="d-block fw-bold text-truncate">
                          {leilao.nome} · {leilao.lote}
                        </span>
                        <span className="d-block small text-body-secondary text-truncate">
                          {leilao.produtor.nomeExploracao} · base{' '}
                          {formatarPreco(leilao.precoBase)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
