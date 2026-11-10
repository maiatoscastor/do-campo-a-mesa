import { useEffect, useState } from 'react';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';
import { textoDaLocalizacao } from '../localizacao.js';

// Página do administrador: aprovar ou rejeitar os produtores que se registaram.
export default function ValidarProdutores() {
  const { pedir } = useSessao();
  // O número do separador e da navegação tem de acompanhar as decisões
  const { recontar } = useTarefasAdmin();
  // null quer dizer que a lista ainda não chegou; uma lista vazia, que não há nenhum à espera
  const [pendentes, setPendentes] = useState(null);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [aDecidir, setADecidir] = useState(null);
  // Muda para voltar a ler a lista (quando se regista um produtor novo, por exemplo)
  const [versao, setVersao] = useState(0);
  useEventoSocket('produtores-mudaram', () => setVersao((n) => n + 1));

  useEffect(() => {
    // Se a página for fechada antes de a resposta chegar, ignora-se a resposta
    let cancelado = false;
    pedir('/admin/produtores/pendentes')
      .then((lista) => {
        if (!cancelado) {
          setPendentes(lista);
        }
      })
      .catch((problema) => {
        if (!cancelado) {
          setErro(problema);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [pedir, versao]);

  async function decidir(conta, aprovado) {
    const { nomeExploracao } = conta.produtor;
    // Um produtor rejeitado sai desta lista, por isso pede-se confirmação
    if (!aprovado && !window.confirm(`Rejeitar "${nomeExploracao}"?`)) {
      return;
    }

    setADecidir(conta.id);
    setErro(null);
    setMensagem('');
    try {
      await pedir(`/admin/produtores/${conta.id}/validacao`, {
        metodo: 'PATCH',
        corpo: { aprovado },
      });
      setPendentes((lista) => lista.filter(({ id }) => id !== conta.id));
      recontar();
      setMensagem(
        `"${nomeExploracao}" foi ${aprovado ? 'aprovado' : 'rejeitado'}.`,
      );
    } catch (problema) {
      setErro(problema);
    } finally {
      setADecidir(null);
    }
  }

  return (
    <>
      <title>Validar produtores · Do Campo à Mesa</title>
      <h1 className="mb-3">Validar produtores</h1>

      <AlertaDeErro erro={erro} />
      {/* O role="status" faz os leitores de ecrã anunciarem o resultado */}
      <p className="text-body-secondary" role="status">
        {mensagem || (pendentes === null && !erro && 'A carregar…')}
      </p>

      {pendentes?.length === 0 && (
        <EstadoVazio
          icone="validar"
          titulo="Não há produtores à espera"
          texto="Os produtores que se registarem aparecem aqui para serem validados."
        />
      )}

      {pendentes?.length > 0 && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {pendentes.map((conta) => (
            <div className="col" key={conta.id}>
              <article className="card h-100">
                <div className="card-body d-flex flex-column">
                  <h2 className="h3">{conta.produtor.nomeExploracao}</h2>
                  <p className="mb-1">
                    {textoDaLocalizacao(conta.produtor.localizacao)}
                  </p>
                  <p className="text-body-secondary text-break">
                    {conta.nome} · {conta.email}
                  </p>
                  {conta.produtor.descricao && (
                    <p>{conta.produtor.descricao}</p>
                  )}
                  <div className="d-flex flex-wrap gap-2 mt-auto">
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={aDecidir === conta.id}
                      onClick={() => decidir(conta, true)}
                    >
                      Aprovar
                    </button>
                    <button
                      className="btn btn-suave-perigo"
                      type="button"
                      disabled={aDecidir === conta.id}
                      onClick={() => decidir(conta, false)}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
