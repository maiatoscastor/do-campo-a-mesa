import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import ImagemProduto from '../components/ImagemProduto.jsx';
import { useSessao } from '../hooks/useSessao.js';
import { formatarPreco, STOCK_BAIXO } from '../produtos.js';

// Os produtos do produtor com sessão, com o aviso de stock baixo e as ações de editar e apagar.
export default function MeusProdutos() {
  const { utilizador, pedir } = useSessao();
  const aprovado = utilizador.produtor?.validacao === 'aprovado';
  const [produtos, setProdutos] = useState(null);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    let cancelado = false;
    pedir('/products/meus')
      .then((lista) => !cancelado && setProdutos(lista))
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir]);

  async function apagar(produto) {
    if (!window.confirm(`Apagar "${produto.nome}"?`)) {
      return;
    }
    setErro(null);
    try {
      await pedir(`/products/${produto.id}`, { metodo: 'DELETE' });
      setProdutos((lista) => lista.filter(({ id }) => id !== produto.id));
      setMensagem(`"${produto.nome}" foi apagado.`);
    } catch (problema) {
      setErro(problema);
    }
  }

  return (
    <>
      <title>Os meus produtos · Do Campo à Mesa</title>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h1 className="mb-0 me-auto">Os meus produtos</h1>
        {aprovado && (
          <Link className="btn btn-primary" to="/conta/produtos/novo">
            Novo produto
          </Link>
        )}
      </div>

      {!aprovado && (
        <div className="alert alert-warning">
          A sua conta ainda não foi aprovada. Poderá publicar produtos assim que
          um administrador a aprovar.
        </div>
      )}
      <AlertaDeErro erro={erro} />
      <p className="text-body-secondary small" role="status">
        {mensagem || (produtos === null && !erro && 'A carregar…')}
      </p>

      {produtos?.length === 0 && (
        <EstadoVazio
          icone="produtos"
          titulo="Ainda não tem produtos"
          texto="Os produtos que criar aparecem aqui."
        />
      )}

      {produtos?.length > 0 && (
        <ul className="list-group">
          {produtos.map((produto) => (
            <li
              className="list-group-item d-flex flex-wrap align-items-center gap-3"
              key={produto.id}
            >
              <ImagemProduto
                produto={produto}
                className="imagem-produto-mini"
              />
              <div className="lista-produtos-texto">
                <p className="fw-bold mb-0 text-truncate">{produto.nome}</p>
                <p className="small text-body-secondary mb-1">
                  {formatarPreco(produto.preco)} / {produto.unidade} · stock{' '}
                  {produto.stock}
                </p>
                {produto.stock === 0 && (
                  <span className="selo selo-esgotado">Esgotado</span>
                )}
                {produto.stock > 0 && produto.stock <= STOCK_BAIXO && (
                  <span className="selo selo-stock-baixo">Stock baixo</span>
                )}
              </div>
              <div className="d-flex gap-2">
                <Link
                  className="btn btn-suave btn-sm"
                  to={`/conta/produtos/${produto.id}`}
                >
                  Editar
                </Link>
                <button
                  className="btn btn-suave-perigo btn-sm"
                  type="button"
                  onClick={() => apagar(produto)}
                >
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
