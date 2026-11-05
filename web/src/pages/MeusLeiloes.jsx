import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { useAgora } from '../hooks/useAgora.js';
import { useSessao } from '../hooks/useSessao.js';
import { faseDoLeilao, formatarDia, formatarHora } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

const NOMES_DAS_FASES = {
  agendado: 'Agendado',
  ativo: 'Em direto',
  'a fechar': 'A fechar',
  terminado: 'Terminado',
};

const SELOS_DAS_FASES = {
  agendado: 'selo-confirmada',
  ativo: 'selo-direto',
  'a fechar': 'selo-entregue',
  terminado: 'selo-entregue',
};

// Os leilões do produtor com sessão, com o estado de cada um. Os que ainda não começaram podem ser
// cancelados.
export default function MeusLeiloes() {
  const { utilizador, pedir } = useSessao();
  const aprovado = utilizador.produtor?.validacao === 'aprovado';
  const [leiloes, setLeiloes] = useState(null);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const agora = useAgora();

  useEffect(() => {
    let cancelado = false;
    pedir('/auctions/meus')
      .then((lista) => !cancelado && setLeiloes(lista))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir]);

  async function cancelar(leilao) {
    if (!window.confirm(`Cancelar o leilão de "${leilao.nome}"?`)) {
      return;
    }
    setErro(null);
    try {
      await pedir(`/auctions/${leilao.id}`, { metodo: 'DELETE' });
      setLeiloes((lista) => lista.filter(({ id }) => id !== leilao.id));
      setMensagem(`O leilão de "${leilao.nome}" foi cancelado.`);
    } catch (problema) {
      setErro(problema);
    }
  }

  return (
    <>
      <title>Os meus leilões · Do Campo à Mesa</title>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0 me-auto">Os meus leilões</h1>
        {aprovado && (
          <Link className="btn btn-primary" to="/conta/leiloes/novo">
            Novo leilão
          </Link>
        )}
      </div>

      {!aprovado && (
        <div className="alert alert-warning">
          A sua conta ainda não foi aprovada. Poderá criar leilões assim que um
          administrador a aprovar.
        </div>
      )}
      <AlertaDeErro erro={erro} />
      <p className="text-body-secondary small" role="status">
        {mensagem || (leiloes === null && !erro && 'A carregar…')}
      </p>

      {leiloes?.length === 0 && (
        <EstadoVazio
          icone="leiloes"
          titulo="Ainda não tem leilões"
          texto="Os leilões que criar aparecem aqui, com o estado de cada um."
        />
      )}

      {leiloes?.length > 0 && (
        <ul className="list-group">
          {leiloes.map((leilao) => {
            const fase = faseDoLeilao(leilao, agora);
            return (
              <li
                className="list-group-item d-flex flex-wrap align-items-center gap-3"
                key={leilao.id}
              >
                <ImagemProduto
                  produto={leilao}
                  className="imagem-produto-mini"
                />
                <div className="lista-produtos-texto">
                  <p className="fw-bold mb-0 text-truncate">
                    {leilao.nome} · {leilao.lote}
                  </p>
                  <p className="small text-body-secondary mb-1">
                    {formatarDia(leilao.iniciaEm)} às{' '}
                    {formatarHora(leilao.iniciaEm)} ·{' '}
                    {leilao.numeroDeLicitacoes > 0
                      ? `${formatarPreco(leilao.licitacaoAtual.valor)} (${leilao.numeroDeLicitacoes} ${
                          leilao.numeroDeLicitacoes === 1
                            ? 'licitação'
                            : 'licitações'
                        })`
                      : `base ${formatarPreco(leilao.precoBase)}`}
                  </p>
                  <span className={`selo ${SELOS_DAS_FASES[fase]}`}>
                    {NOMES_DAS_FASES[fase]}
                  </span>
                </div>
                <div className="d-flex gap-2">
                  <Link
                    className="btn btn-suave btn-sm"
                    to={`/leiloes/${leilao.id}`}
                  >
                    {fase === 'ativo' ? 'Acompanhar' : 'Ver'}
                  </Link>
                  {fase === 'agendado' && (
                    <button
                      className="btn btn-suave-perigo btn-sm"
                      type="button"
                      onClick={() => cancelar(leilao)}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
