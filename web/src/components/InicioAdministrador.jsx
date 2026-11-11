import { useEffect, useState } from 'react';
import AlertaDeErro from './AlertaDeErro.jsx';
import AtalhoInicio from './AtalhoInicio.jsx';
import Indicador from './Indicador.jsx';
import { UltimasEncomendas, UltimosRegistos } from './ListasDoPainel.jsx';
import SeccaoInicio from './SeccaoInicio.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';
import { comparacao } from '../indicadores.js';
import { formatarPreco } from '../produtos.js';
import { primeiroNome } from '../utilizador.js';

// "1 comprador", "3 compradores"
function contar(numero, singular, plural) {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

// O texto por baixo de cada atalho: "Nada à espera", "1 à espera de validação"…
function textoDaEspera(numero, umaEspera, variasEsperam) {
  if (numero === null) {
    return 'A contar…';
  }
  if (numero === 0) {
    return 'Nada à espera';
  }
  return numero === 1 ? umaEspera : `${numero} ${variasEsperam}`;
}

// O início do administrador: o que espera pela decisão dele (com os números da navegação), a
// aplicação em números, e as últimas encomendas e os últimos registos. Os números voltam a ser
// lidos sozinhos quando o servidor avisa que mudaram (uma encomenda, um registo, um leilão).
export default function InicioAdministrador() {
  const { utilizador, pedir } = useSessao();
  const { produtoresPorValidar, denunciasPorDecidir } = useTarefasAdmin();
  const [painel, setPainel] = useState(null);
  const [erro, setErro] = useState(null);
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('painel-mudou', recarregar);
  useEventoSocket('produtores-mudaram', recarregar);

  useEffect(() => {
    let cancelado = false;
    pedir('/admin/painel')
      .then((dados) => {
        if (!cancelado) {
          setPainel(dados);
          setErro(null);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, versao]);

  const atalhos = [
    {
      caminho: '/admin/produtores',
      icone: 'validar',
      titulo: 'Produtores por validar',
      texto: textoDaEspera(
        produtoresPorValidar,
        '1 à espera de validação',
        'à espera de validação',
      ),
      numero: produtoresPorValidar,
      sufixo: 'por validar',
    },
    {
      caminho: '/admin/denuncias',
      icone: 'denuncia',
      titulo: 'Denúncias por decidir',
      texto: textoDaEspera(
        denunciasPorDecidir,
        '1 avaliação denunciada',
        'avaliações denunciadas',
      ),
      numero: denunciasPorDecidir,
      sufixo: 'por decidir',
    },
  ];

  return (
    <>
      <div className="inicio-cabecalho">
        <div>
          <h1 className="mb-1">Olá, {primeiroNome(utilizador.nome)}</h1>
          <p className="text-body-secondary mb-0">
            O que espera por si e como está a aplicação.
          </p>
        </div>
      </div>
      <AlertaDeErro erro={erro} />

      <SeccaoInicio titulo="Por decidir">
        <div className="row row-cols-1 row-cols-md-2 g-3">
          {atalhos.map((atalho) => (
            <div className="col" key={atalho.caminho}>
              <AtalhoInicio {...atalho} />
            </div>
          ))}
        </div>
      </SeccaoInicio>

      {painel && (
        <>
          <Numeros painel={painel} />
          <div className="row gx-4 colunas-inicio">
            <div className="col-lg-7">
              <UltimasEncomendas
                encomendas={painel.ultimasEncomendas.slice(0, 5)}
              />
            </div>
            <div className="col-lg-5">
              <UltimosRegistos registos={painel.ultimosRegistos.slice(0, 5)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Numeros({ painel }) {
  const { utilizadores, produtos, encomendas, leiloes } = painel;
  const { ultimos30, anteriores30 } = encomendas;
  const pessoas = utilizadores.compradores + utilizadores.produtores;
  return (
    <SeccaoInicio
      titulo="A aplicação em números"
      ligacao="/admin/painel"
      textoDaLigacao="Ver o painel"
    >
      <div className="row row-cols-2 row-cols-xl-4 g-3">
        <div className="col">
          <Indicador
            rotulo="Utilizadores"
            valor={pessoas}
            detalhe={`${contar(utilizadores.compradores, 'comprador', 'compradores')} · ${contar(utilizadores.produtores, 'produtor', 'produtores')}`}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Produtos à venda"
            valor={produtos}
            detalhe="de produtores aprovados"
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Encomendas · 30 dias"
            valor={ultimos30.quantas}
            detalhe={formatarPreco(ultimos30.valor)}
            comparacao={comparacao(ultimos30.quantas, anteriores30.quantas)}
          />
        </div>
        <div className="col">
          <Indicador
            rotulo="Leilões a decorrer"
            valor={leiloes.aDecorrer}
            detalhe={contar(leiloes.marcados, 'marcado', 'marcados')}
          />
        </div>
      </div>
    </SeccaoInicio>
  );
}
