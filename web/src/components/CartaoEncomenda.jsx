import { Link } from 'react-router';
import Estrelas from './Estrelas.jsx';
import Icone from './Icone.jsx';
import {
  ESTADOS,
  formatarData,
  formatarDataCurta,
  somar,
} from '../encomendas.js';
import { textoDaLocalizacao } from '../localizacao.js';
import { formatarPreco } from '../produtos.js';

// Uma encomenda, vista pelo comprador ou pelo produtor ("para"): o estado com as datas de cada passo,
// os produtos, o total e como vai ser entregue. As ações (por exemplo, mudar o estado) vêm em children.
export default function CartaoEncomenda({ encomenda, para, children }) {
  const { produtor, comprador, linhas, total, modo, morada, historico } =
    encomenda;
  const dataDe = (estado) =>
    historico.find((passo) => passo.estado === estado)?.data;
  const atual = ESTADOS.findIndex(({ estado }) => estado === encomenda.estado);

  let entrega = `Entregar em ${morada}`;
  if (modo === 'levantamento') {
    entrega =
      para === 'comprador'
        ? `Levantar na quinta · ${textoDaLocalizacao(produtor.localizacao)}`
        : 'O comprador vem levantar';
  } else if (para === 'comprador') {
    entrega = `Entrega em ${morada}`;
  }

  return (
    <article className="card mb-3">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-baseline gap-2 mb-1">
          <h2 className="h6 mb-0 me-auto">
            {para === 'comprador' ? (
              <Link to={`/produtores/${produtor.id}`}>
                {produtor.nomeExploracao}
              </Link>
            ) : (
              comprador.nome
            )}
          </h2>
          <span className={`selo selo-${encomenda.estado}`}>
            {ESTADOS[atual].nome}
          </span>
        </div>
        <p className="small text-body-secondary mb-3">
          {encomenda.origem === 'leilao' ? 'Ganha em leilão a' : 'Feita a'}{' '}
          {formatarData(encomenda.createdAt)}
          {para === 'produtor' && ` · ${comprador.email}`}
        </p>

        {/* Os quatro passos, com a data de cada um que já aconteceu */}
        <ol className="passos-encomenda">
          {ESTADOS.map(({ estado, nome }, indice) => (
            <li
              key={estado}
              className={indice <= atual ? 'feito' : undefined}
              aria-current={indice === atual ? 'step' : undefined}
            >
              <span className="passos-encomenda-nome">{nome}</span>
              {dataDe(estado) && (
                <span className="passos-encomenda-data">
                  {formatarDataCurta(dataDe(estado))}
                </span>
              )}
            </li>
          ))}
        </ol>

        <ul className="list-unstyled small mb-2">
          {linhas.map(({ produto, nome, unidade, preco, quantidade }) => (
            <li className="d-flex gap-2" key={produto}>
              <span className="me-auto">
                {quantidade} × {nome}{' '}
                <span className="text-body-secondary">
                  ({formatarPreco(preco)} / {unidade})
                </span>
              </span>
              <span className="numeros">
                {formatarPreco(somar([{ preco, quantidade }]))}
              </span>
            </li>
          ))}
        </ul>
        <p className="d-flex mb-2">
          <span className="me-auto">Total</span>
          <strong className="numeros">{formatarPreco(total)}</strong>
        </p>
        <p className="small text-body-secondary mb-0">{entrega}</p>
        <AvaliacaoDaEncomenda encomenda={encomenda} para={para} />
        {children}
      </div>
    </article>
  );
}

// Depois de entregue: o comprador avalia (ou vê a nota que deu e pode mudá-la), e o produtor vê a
// nota que recebeu, com a ligação para as suas avaliações
function AvaliacaoDaEncomenda({ encomenda, para }) {
  const { id, estado, avaliacao, produtor } = encomenda;
  if (estado !== 'entregue') {
    return null;
  }
  if (para === 'produtor') {
    return (
      avaliacao && (
        <p className="avaliacao-da-encomenda">
          <span>Avaliação do comprador</span>
          <Estrelas valor={avaliacao.classificacao} tamanho={16} />
          <Link to={`/produtores/${produtor}/avaliacoes`}>Ver</Link>
        </p>
      )
    );
  }
  if (!avaliacao) {
    return (
      <Link
        className="btn btn-suave btn-sm mt-3 d-inline-flex align-items-center gap-1"
        to={`/encomendas/${id}/avaliar`}
      >
        <Icone nome="estrela" tamanho={18} />
        Avaliar a encomenda
      </Link>
    );
  }
  return (
    <p className="avaliacao-da-encomenda">
      <span>A sua avaliação</span>
      <Estrelas valor={avaliacao.classificacao} tamanho={16} />
      <Link to={`/encomendas/${id}/avaliar`}>Mudar</Link>
    </p>
  );
}
