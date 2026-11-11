import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import AlertaDeErro from '../components/AlertaDeErro.jsx';
import AlternarProdutos from '../components/AlternarProdutos.jsx';
import CartaoProdutor from '../components/CartaoProdutor.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import Icone from '../components/Icone.jsx';
import { useFavoritos } from '../hooks/useFavoritos.js';
import { useSessao } from '../hooks/useSessao.js';

// As ordens que o servidor conhece (GET /api/producers?ordem=)
const ORDENS = [
  { valor: 'requisitados', nome: 'Mais requisitados' },
  { valor: 'avaliados', nome: 'Mais bem avaliados' },
  { valor: 'novos', nome: 'Novos' },
];

// Todos os produtores aprovados, abertos a todos, com pesquisa, três ordens e, para quem tem sessão,
// só os favoritos. Como no catálogo, a escolha fica no endereço (?ordem=novos&favoritos=true): não se
// perde ao recarregar e o botão de recuar volta à escolha anterior.
export default function Produtores() {
  const { pedir } = useSessao();
  const { podeTer } = useFavoritos();
  const [parametros, setParametros] = useSearchParams();
  const ordem = ORDENS.some(({ valor }) => valor === parametros.get('ordem'))
    ? parametros.get('ordem')
    : 'requisitados';
  const q = parametros.get('q') ?? '';
  const soFavoritos = podeTer && parametros.get('favoritos') === 'true';
  const [pesquisa, setPesquisa] = useState(q);
  const [produtores, setProdutores] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const consulta = new URLSearchParams({ ordem });
    if (q) {
      consulta.set('q', q);
    }
    if (soFavoritos) {
      consulta.set('favoritos', 'true');
    }
    let cancelado = false;
    pedir(`/producers?${consulta}`)
      .then((lista) => {
        if (!cancelado) {
          setProdutores(lista);
          setErro(null);
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [pedir, ordem, q, soFavoritos]);

  function escolher(nome, valor) {
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
    escolher('q', pesquisa.trim());
  }

  return (
    <>
      <title>Produtores · Do Campo à Mesa</title>
      <AlternarProdutos />
      <h1 className="mb-3">Produtores</h1>

      <form className="d-flex gap-2 mb-3" role="search" onSubmit={pesquisar}>
        <label className="visually-hidden" htmlFor="pesquisa-produtores">
          Pesquisar produtores
        </label>
        <input
          id="pesquisa-produtores"
          className="form-control"
          type="search"
          placeholder="Nome ou concelho"
          value={pesquisa}
          onChange={(evento) => setPesquisa(evento.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Pesquisar
        </button>
      </form>

      {/* Os favoritos ligam-se e desligam-se (caixa de seleção) e ficam primeiro, para se verem
          sempre no telemóvel; a ordem é uma escolha entre três (botões de opção). Todos com o
          aspeto de botões, numa faixa que desliza no telemóvel. */}
      <div className="escolhas mb-3">
        {podeTer && (
          <span>
            <input
              id="so-favoritos"
              className="btn-check"
              type="checkbox"
              checked={soFavoritos}
              onChange={(evento) =>
                escolher('favoritos', evento.target.checked ? 'true' : '')
              }
            />
            <label className="btn btn-escolha" htmlFor="so-favoritos">
              <Icone nome="favorito" cheio={soFavoritos} tamanho={18} />
              Favoritos
            </label>
          </span>
        )}
        <fieldset>
          <legend className="visually-hidden">Ordenar</legend>
          {ORDENS.map(({ valor, nome }) => (
            <span key={valor}>
              <input
                id={`ordem-${valor}`}
                className="btn-check"
                type="radio"
                name="ordem"
                checked={ordem === valor}
                onChange={() =>
                  escolher('ordem', valor === 'requisitados' ? '' : valor)
                }
              />
              <label className="btn btn-escolha" htmlFor={`ordem-${valor}`}>
                {nome}
              </label>
            </span>
          ))}
        </fieldset>
      </div>

      <AlertaDeErro erro={erro} />
      {/* Anunciado aos leitores de ecrã quando muda, por exemplo, depois de pesquisar */}
      <p className="text-body-secondary small" role="status">
        {produtores === null && !erro && 'A carregar…'}
        {produtores?.length > 0 &&
          `${produtores.length} ${produtores.length === 1 ? 'produtor' : 'produtores'}`}
      </p>

      {produtores?.length === 0 && (
        <SemProdutores q={q} soFavoritos={soFavoritos} />
      )}

      {produtores?.length > 0 && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {produtores.map((produtor) => (
            <div className="col" key={produtor.id}>
              <CartaoProdutor produtor={produtor} nivel="h2" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// A mensagem certa para cada caso sem resultados
function SemProdutores({ q, soFavoritos }) {
  if (soFavoritos && !q) {
    return (
      <EstadoVazio
        icone="favorito"
        titulo="Ainda não tem favoritos"
        texto="Toque no coração de um produtor para o guardar aqui. Quando ele marcar um leilão, recebe uma notificação."
      />
    );
  }
  if (q || soFavoritos) {
    return (
      <EstadoVazio
        icone="pessoas"
        titulo="Nenhum produtor encontrado"
        texto="Experimente outra pesquisa."
      />
    );
  }
  return (
    <EstadoVazio
      icone="pessoas"
      titulo="Ainda não há produtores"
      texto="Os produtores aparecem aqui assim que a conta deles for aprovada."
    />
  );
}
