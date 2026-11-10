import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/cliente.js';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import Campo from '../components/Campo.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import Icone from '../components/Icone.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import Quantidade from '../components/Quantidade.jsx';
import { somar } from '../encomendas.js';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { useFormulario } from '../hooks/useFormulario.js';
import { useSessao } from '../hooks/useSessao.js';
import { textoDaLocalizacao } from '../localizacao.js';
import { formatarPreco } from '../produtos.js';

const MODOS = [
  { valor: 'levantamento', titulo: 'Levantar na quinta', icone: 'quinta' },
  { valor: 'entrega', titulo: 'Entrega na morada', icone: 'entrega' },
];

// Os produtos agrupados por produtor, porque cada produtor recebe a sua encomenda
function agruparPorProdutor(linhas) {
  const grupos = new Map();
  for (const linha of linhas) {
    const { produtor } = linha.produto;
    const anteriores = grupos.get(produtor.id)?.linhas ?? [];
    grupos.set(produtor.id, { produtor, linhas: [...anteriores, linha] });
  }
  return [...grupos.values()];
}

// O total de uma lista de linhas do carrinho, com o preço que cada produto tem agora
function totalDe(linhas) {
  return somar(
    linhas.map(({ produto, quantidade }) => ({
      preco: produto.preco,
      quantidade,
    })),
  );
}

// O carrinho: aberto a todos, mas para encomendar é preciso entrar. Ao encomendar, o servidor
// confirma os preços e o stock, e cria uma encomenda por produtor.
export default function Carrinho() {
  const { utilizador, pedir } = useSessao();
  const { linhas, definir, renovar, retirar } = useCarrinho();
  const navegar = useNavigate();
  const { valores, mudar, erro, aEnviar, enviar, formulario } = useFormulario({
    modo: 'levantamento',
    morada: '',
  });
  // Os produtos que continuam à venda, segundo o servidor (null enquanto não se sabe)
  const [aVenda, setAVenda] = useState(null);
  // Muda para voltar a ler os produtos (por exemplo, quando o stock acabou entretanto)
  const [leitura, setLeitura] = useState(0);
  const ids = linhas.map(({ produto }) => produto.id).join(',');

  // O preço e o stock podem ter mudado desde que os produtos foram escolhidos: lêem-se os atuais.
  // Sem resposta do servidor, fica o que se sabia; ao encomendar, ele volta a confirmar tudo.
  useEffect(() => {
    if (!ids) {
      return undefined;
    }
    let cancelado = false;
    api(`/products?ids=${ids}`)
      .then((produtos) => {
        if (!cancelado) {
          renovar(produtos);
          setAVenda(new Set(produtos.map(({ id }) => id)));
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [ids, renovar, leitura]);

  // O que impede um produto de ser encomendado, se houver alguma coisa
  function problemaDe({ produto, quantidade }) {
    if (aVenda && !aVenda.has(produto.id)) {
      return 'Já não está à venda';
    }
    if (produto.stock === 0) {
      return 'Esgotado';
    }
    if (quantidade > produto.stock) {
      return `Só há ${produto.stock}`;
    }
    return null;
  }

  const grupos = agruparPorProdutor(linhas);
  const comProblemas = linhas.some(problemaDe);

  function encomendar(evento) {
    evento.preventDefault();
    enviar(async () => {
      try {
        const encomendas = await pedir('/orders', {
          metodo: 'POST',
          corpo: {
            linhas: linhas.map(({ produto, quantidade }) => ({
              produto: produto.id,
              quantidade,
            })),
            ...valores,
          },
        });
        retirar(linhas.map(({ produto }) => produto.id));
        navegar('/encomendas', { state: { feitas: encomendas.length } });
      } catch (problema) {
        // O stock mudou entretanto: volta a ler-se, para o produto ficar assinalado
        if (problema.estado === 409) {
          setLeitura((n) => n + 1);
        }
        throw problema;
      }
    });
  }

  if (linhas.length === 0) {
    return (
      <>
        <title>Carrinho · Do Campo à Mesa</title>
        <h1 className="mb-3">Carrinho</h1>
        <EstadoVazio
          icone="carrinho"
          titulo="O carrinho está vazio"
          texto="Os produtos que escolher ficam aqui até fazer a encomenda."
        >
          <Link className="btn btn-primary" to="/produtos">
            Ver produtos
          </Link>
        </EstadoVazio>
      </>
    );
  }

  return (
    <>
      <title>Carrinho · Do Campo à Mesa</title>
      <h1 className="mb-3">Carrinho</h1>
      <div className="row g-4">
        <div className="col-lg-7 col-xl-8">
          {grupos.map(({ produtor, linhas: doProdutor }) => (
            <section className="card mb-3" key={produtor.id}>
              <div className="card-body">
                <h2 className="h6 mb-0">
                  <Link to={`/produtores/${produtor.id}`}>
                    {produtor.nomeExploracao}
                  </Link>
                </h2>
                <p className="small text-body-secondary mb-0">
                  {textoDaLocalizacao(produtor.localizacao)}
                </p>
                <ul className="carrinho-linhas">
                  {doProdutor.map((linha) => (
                    <LinhaDoCarrinho
                      key={linha.produto.id}
                      linha={linha}
                      problema={problemaDe(linha)}
                      aoMudar={(quantidade) =>
                        definir(linha.produto, quantidade)
                      }
                    />
                  ))}
                </ul>
                {grupos.length > 1 && (
                  <p className="carrinho-subtotal">
                    Subtotal{' '}
                    <strong>{formatarPreco(totalDe(doProdutor))}</strong>
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="col-lg-5 col-xl-4">
          <form
            className="card carrinho-resumo"
            ref={formulario}
            onSubmit={encomendar}
            noValidate
          >
            <div className="card-body">
              <fieldset className="mb-3">
                <legend className="h6">Como quer receber?</legend>
                <div className="row row-cols-2 g-2">
                  {MODOS.map(({ valor, titulo, icone }) => (
                    <div className="col" key={valor}>
                      <label className="opcao">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="modo"
                          value={valor}
                          checked={valores.modo === valor}
                          onChange={mudar}
                        />
                        <Icone nome={icone} className="opcao-icone" />
                        <span className="fw-bold">{titulo}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </fieldset>
              {valores.modo === 'entrega' && (
                <Campo
                  rotulo="Morada de entrega"
                  nome="morada"
                  tipo="textarea"
                  rows={2}
                  autoComplete="street-address"
                  value={valores.morada}
                  onChange={mudar}
                  erro={erro?.detalhes?.morada}
                />
              )}

              <AlertaDeErro erro={erro} />
              <p className="carrinho-total">
                Total <strong>{formatarPreco(totalDe(linhas))}</strong>
              </p>
              {grupos.length > 1 && (
                <p className="small text-body-secondary">
                  São {grupos.length} encomendas, uma por produtor.
                </p>
              )}

              {utilizador ? (
                <button
                  className="btn btn-primary w-100"
                  type="submit"
                  disabled={aEnviar || comProblemas}
                >
                  {aEnviar ? 'A encomendar…' : 'Encomendar'}
                </button>
              ) : (
                <div className="d-grid gap-2">
                  <Link
                    className="btn btn-primary"
                    to="/entrar"
                    state={{ depois: '/carrinho' }}
                    viewTransition
                  >
                    Entrar para encomendar
                  </Link>
                  <Link
                    className="btn btn-suave"
                    to="/registar"
                    state={{ depois: '/carrinho' }}
                    viewTransition
                  >
                    Criar conta
                  </Link>
                </div>
              )}
              {comProblemas && (
                <p className="small text-danger-emphasis mt-2 mb-0">
                  Ajuste os produtos assinalados para poder encomendar.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function LinhaDoCarrinho({ linha, problema, aoMudar }) {
  const { produto, quantidade } = linha;
  const aVenda = problema !== 'Já não está à venda';

  return (
    <li className="carrinho-linha">
      <ImagemProduto produto={produto} className="imagem-produto-mini" />
      <div className="carrinho-linha-texto">
        <p className="fw-semibold mb-0">{produto.nome}</p>
        <p className="small text-body-secondary mb-0">
          {formatarPreco(produto.preco)} / {produto.unidade}
        </p>
        {problema && (
          <p className="small text-danger-emphasis fw-semibold mb-0">
            {problema}
          </p>
        )}
      </div>
      <div className="carrinho-linha-acoes">
        {aVenda ? (
          <Quantidade
            nome={produto.nome}
            valor={quantidade}
            maximo={produto.stock}
            aoMudar={aoMudar}
          />
        ) : (
          <button
            className="btn btn-suave-perigo btn-sm"
            type="button"
            onClick={() => aoMudar(0)}
          >
            Tirar
          </button>
        )}
        <strong className="carrinho-linha-preco">
          {formatarPreco(totalDe([linha]))}
        </strong>
      </div>
    </li>
  );
}
