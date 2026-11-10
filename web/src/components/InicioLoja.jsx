import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/cliente.js';
import AlertaDeErro from './AlertaDeErro.jsx';
import AsSuasEncomendas from './AsSuasEncomendas.jsx';
import CategoriasInicio from './CategoriasInicio.jsx';
import ComoFunciona from './ComoFunciona.jsx';
import ComprarOutraVez from './ComprarOutraVez.jsx';
import DestaqueLeilao from './DestaqueLeilao.jsx';
import Mosaico from './Mosaico.jsx';
import PesquisaInicio from './PesquisaInicio.jsx';
import ProdutoresInicio from './ProdutoresInicio.jsx';
import ProdutosDaEpoca from './ProdutosDaEpoca.jsx';
import ProximosLeiloes from './ProximosLeiloes.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import {
  encomendasPorAcompanhar,
  produtosParaComprarOutraVez,
} from '../encomendas.js';
import { faseDoLeilao } from '../leiloes.js';
import { primeiroNome } from '../utilizador.js';

// De quanto em quanto tempo a agenda dos leilões é lida outra vez (a sala do leilão é que está em
// direto); assim um leilão que entretanto abriu passa para o destaque
const ATUALIZAR_LEILOES = 20000;

// Quantos leilões marcados aparecem na secção da agenda
const PROXIMOS = 3;

// Até quantos produtos "Comprar outra vez" fica numa coluna, ao lado de outra secção, em vez de
// ocupar uma linha inteira quase vazia
const OUTRA_VEZ_NUMA_COLUNA = 3;

// O início do visitante e do comprador: a apresentação com a pesquisa e o leilão em destaque, e por
// baixo as categorias, os produtos da época, os próximos leilões e alguns produtores. O comprador
// vê também as suas encomendas e o que pode comprar outra vez; o visitante, como funciona.
//
// No computador, o topo fica compacto e as listas curtas vão aos pares, lado a lado (as encomendas
// com os próximos leilões, ou os próximos leilões com os produtores), para o primeiro ecrã mostrar
// várias coisas e deixar ver que a página continua.
export default function InicioLoja() {
  const { utilizador, pedir } = useSessao();
  const comprador = utilizador?.papel === 'comprador';
  const agora = useAgora();
  const [produtos, setProdutos] = useState(null);
  const [produtores, setProdutores] = useState(null);
  const [leiloes, setLeiloes] = useState(null);
  const [encomendas, setEncomendas] = useState(null);
  const [erro, setErro] = useState(null);
  // Muda para voltar a ler as encomendas (quando o produtor muda o estado de uma)
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('encomenda-atualizada', recarregar);
  useEventoSocket('leilao-ganho', recarregar);

  // O catálogo e os produtores, uma vez
  useEffect(() => {
    let cancelado = false;
    Promise.all([api('/products'), api('/producers?comProdutos=true')])
      .then(([doCatalogo, deProdutores]) => {
        if (!cancelado) {
          setProdutos(doCatalogo);
          setProdutores(deProdutores);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, []);

  // A agenda dos leilões, de 20 em 20 segundos
  useEffect(() => {
    let cancelado = false;
    const ler = () =>
      api('/auctions')
        .then((lista) => !cancelado && setLeiloes(lista))
        .catch(() => {});
    ler();
    const relogio = setInterval(ler, ATUALIZAR_LEILOES);
    return () => {
      cancelado = true;
      clearInterval(relogio);
    };
  }, []);

  // As encomendas do comprador
  useEffect(() => {
    if (!comprador) {
      return undefined;
    }
    let cancelado = false;
    pedir('/orders')
      .then((lista) => !cancelado && setEncomendas(lista))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [comprador, pedir, versao]);

  // O destaque é o leilão a decorrer que acaba primeiro ou, sem nenhum, o próximo; a agenda mostra
  // os marcados a seguir, sem repetir o do destaque
  const porFase = (fase, data) =>
    (leiloes ?? [])
      .filter((leilao) => faseDoLeilao(leilao, agora) === fase)
      .sort((a, b) => new Date(a[data]) - new Date(b[data]));
  const aDecorrer = porFase('ativo', 'terminaEm');
  const marcados = porFase('agendado', 'iniciaEm');
  const proximoEmDestaque = aDecorrer.length === 0 ? marcados[0] : null;
  const naAgenda = marcados
    .filter((leilao) => leilao !== proximoEmDestaque)
    .slice(0, PROXIMOS);

  // As secções curtas vão aos pares no computador. As que precisam de companhia (as encomendas e um
  // "Comprar outra vez" curto) ficam com os próximos leilões e os produtores, por esta ordem; os que
  // sobrarem ficam juntos no fim. Uma secção sozinha ocupa a largura toda.
  const comEncomendas =
    comprador && encomendas && encomendasPorAcompanhar(encomendas).length > 0;
  const outraVez =
    comprador && encomendas && produtos
      ? produtosParaComprarOutraVez(encomendas, produtos)
      : [];
  const companhias = [];
  if (naAgenda.length > 0) {
    companhias.push('agenda');
  }
  if (produtores?.length > 0) {
    companhias.push('produtores');
  }
  const aoLadoDasEncomendas = comEncomendas ? companhias.shift() : undefined;
  const aoLadoDeOutraVez =
    outraVez.length > 0 && outraVez.length <= OUTRA_VEZ_NUMA_COLUNA
      ? companhias.shift()
      : undefined;
  const noFim = companhias;

  const companhia = (qual, emPar) =>
    qual === 'agenda' ? (
      <ProximosLeiloes key="agenda" leiloes={naAgenda} />
    ) : (
      <ProdutoresInicio
        key="produtores"
        produtores={produtores}
        naColuna={emPar}
      />
    );

  return (
    <>
      {/* No computador, o leilão em destaque (ou o mosaico) fica ao lado da apresentação; no
          telemóvel, por baixo */}
      <div className="inicio-topo">
        <div className="inicio-apresentacao">
          {utilizador && (
            <p className="h5 mb-2">Olá, {primeiroNome(utilizador.nome)}</p>
          )}
          <h1>Produtos do Alto Minho, diretamente de quem os produz</h1>
          <p className="text-body-secondary">
            Encomende a produtores locais, levante na quinta ou receba em casa,
            e licite em leilões em direto.
          </p>
          <PesquisaInicio />
          <p className="small mt-3 mb-0 d-flex flex-wrap column-gap-3 row-gap-1">
            <Link to="/produtos">Ver todos os produtos</Link>
            <Link to="/leiloes">Ver a agenda dos leilões</Link>
          </p>
        </div>
        {leiloes && (
          <DestaqueLeilao
            aDecorrer={aDecorrer}
            proximo={proximoEmDestaque}
            agora={agora}
            alternativa={
              <div className="inicio-mosaico d-none d-lg-flex">
                <Mosaico />
              </div>
            }
          />
        )}
      </div>

      <AlertaDeErro erro={erro} />

      {comEncomendas && (
        <div className="par-inicio">
          <AsSuasEncomendas encomendas={encomendas} />
          {aoLadoDasEncomendas && companhia(aoLadoDasEncomendas, true)}
        </div>
      )}

      {produtos && <CategoriasInicio produtos={produtos} />}

      {outraVez.length > 0 &&
        (aoLadoDeOutraVez ? (
          <div className="par-inicio">
            <ComprarOutraVez produtos={outraVez} naColuna />
            {companhia(aoLadoDeOutraVez, true)}
          </div>
        ) : (
          <ComprarOutraVez produtos={outraVez} />
        ))}

      {produtos && <ProdutosDaEpoca produtos={produtos} />}

      {noFim.length > 0 && (
        <div className="par-inicio">
          {noFim.map((qual) => companhia(qual, noFim.length > 1))}
        </div>
      )}

      {/* Só depois de o catálogo chegar, para não aparecer sozinho logo por baixo do topo */}
      {!utilizador && (produtos || erro) && <ComoFunciona />}
    </>
  );
}
