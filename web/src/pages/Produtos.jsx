import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../api/cliente.js';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import CartaoProduto from '../components/CartaoProduto.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { CATEGORIAS, EPOCAS } from '../produtos.js';

const FILTROS = [
  'q',
  'categoria',
  'concelho',
  'produtor',
  'epoca',
  'biologico',
];

// Catálogo de produtos, aberto a todos. Os filtros ficam no endereço (?categoria=Mel…): sobrevivem a
// recarregar a página, podem ser partilhados, e o botão de recuar volta ao filtro anterior.
export default function Produtos() {
  const [parametros, setParametros] = useSearchParams();
  const [produtos, setProdutos] = useState(null);
  const [produtores, setProdutores] = useState([]);
  const [erro, setErro] = useState(null);
  const [pesquisa, setPesquisa] = useState(parametros.get('q') ?? '');
  const consulta = parametros.toString();

  // Os produtores servem para os filtros de produtor e de localidade
  useEffect(() => {
    api('/producers?comProdutos=true')
      .then(setProdutores)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelado = false;
    api(`/products${consulta ? `?${consulta}` : ''}`)
      .then((lista) => {
        if (!cancelado) {
          setProdutos(lista);
          setErro(null);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [consulta]);

  // Os concelhos onde há produtores, sem repetir
  const concelhos = useMemo(() => {
    const unicos = new Map(
      produtores
        .filter((p) => p.localizacao?.concelho)
        .map((p) => [p.localizacao.concelho, p.localizacao.nomeConcelho]),
    );
    return [...unicos].sort((a, b) => a[1].localeCompare(b[1], 'pt'));
  }, [produtores]);

  function filtrar(nome, valor) {
    const novos = new URLSearchParams(parametros);
    if (valor) {
      novos.set(nome, valor);
    } else {
      novos.delete(nome);
    }
    setParametros(novos, { replace: true });
  }

  function pesquisar(evento) {
    evento.preventDefault();
    filtrar('q', pesquisa.trim());
  }

  function limpar() {
    setPesquisa('');
    setParametros({}, { replace: true });
  }

  const comFiltros = FILTROS.some((nome) => parametros.has(nome));

  return (
    <>
      <title>Produtos · Do Campo à Mesa</title>
      <h1 className="mb-3">Produtos</h1>

      <form className="d-flex gap-2 mb-3" role="search" onSubmit={pesquisar}>
        <label className="visually-hidden" htmlFor="pesquisa">
          Pesquisar produtos
        </label>
        <input
          id="pesquisa"
          className="form-control"
          type="search"
          placeholder="Produto ou produtor"
          value={pesquisa}
          onChange={(evento) => setPesquisa(evento.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Pesquisar
        </button>
      </form>

      <div className="row row-cols-2 row-cols-md-4 g-2 mb-3 align-items-center">
        <div className="col">
          <select
            className="form-select"
            aria-label="Categoria"
            value={parametros.get('categoria') ?? ''}
            onChange={(evento) => filtrar('categoria', evento.target.value)}
          >
            <option value="">Categoria</option>
            {CATEGORIAS.map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
        <div className="col">
          <select
            className="form-select"
            aria-label="Localidade"
            value={parametros.get('concelho') ?? ''}
            onChange={(evento) => filtrar('concelho', evento.target.value)}
          >
            <option value="">Localidade</option>
            {concelhos.map(([codigo, nome]) => (
              <option key={codigo} value={codigo}>
                {nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <select
            className="form-select"
            aria-label="Produtor"
            value={parametros.get('produtor') ?? ''}
            onChange={(evento) => filtrar('produtor', evento.target.value)}
          >
            <option value="">Produtor</option>
            {produtores.map(({ id, nomeExploracao }) => (
              <option key={id} value={id}>
                {nomeExploracao}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <select
            className="form-select"
            aria-label="Época"
            value={parametros.get('epoca') ?? ''}
            onChange={(evento) => filtrar('epoca', evento.target.value)}
          >
            <option value="">Época</option>
            {EPOCAS.map((epoca) => (
              <option key={epoca}>{epoca}</option>
            ))}
          </select>
        </div>
        <div className="col">
          <div className="form-check mb-0">
            <input
              id="biologico"
              className="form-check-input"
              type="checkbox"
              checked={parametros.get('biologico') === 'true'}
              onChange={(evento) =>
                filtrar('biologico', evento.target.checked ? 'true' : '')
              }
            />
            <label className="form-check-label" htmlFor="biologico">
              Só biológicos
            </label>
          </div>
        </div>
        {comFiltros && (
          <div className="col">
            <button
              className="btn btn-link px-0"
              type="button"
              onClick={limpar}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <AlertaDeErro erro={erro} />
      {/* Anunciado aos leitores de ecrã quando muda, por exemplo, depois de filtrar */}
      <p className="text-body-secondary small" role="status">
        {produtos === null && !erro && 'A carregar…'}
        {produtos?.length > 0 &&
          `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`}
      </p>

      {produtos?.length === 0 && (
        <EstadoVazio
          icone="produtos"
          titulo={
            comFiltros ? 'Nenhum produto encontrado' : 'Ainda não há produtos'
          }
          texto={
            comFiltros
              ? 'Experimente outra pesquisa ou menos filtros.'
              : 'Os produtos aparecem aqui assim que os produtores os publicarem.'
          }
        />
      )}

      {produtos?.length > 0 && (
        <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
          {produtos.map((produto) => (
            <div className="col" key={produto.id}>
              <CartaoProduto produto={produto} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
