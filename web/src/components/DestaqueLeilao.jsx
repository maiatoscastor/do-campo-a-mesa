import { Link } from 'react-router';
import ImagemProduto from './ImagemProduto.jsx';
import { formatarDiaCurto, formatarHora, formatarTempo } from '../leiloes.js';
import { formatarPreco } from '../produtos.js';

// O leilão em destaque no início, num bloco verde ao lado da apresentação: o que está a decorrer e
// acaba primeiro ou, se não houver nenhum, o próximo da agenda (quem escolhe é o início, que lê a
// agenda). Mostra a licitação atual (ou o preço base) e o tempo que falta, ou quando começa. Sem
// leilões, mostra a alternativa (o mosaico das ilustrações).
export default function DestaqueLeilao({
  aDecorrer,
  proximo,
  agora,
  alternativa = null,
}) {
  const leilao = aDecorrer[0] ?? proximo;
  if (!leilao) {
    return alternativa;
  }
  const aoVivo = aDecorrer.length > 0;
  const { nome, lote, produtor, licitacaoAtual, numeroDeLicitacoes } = leilao;
  const concelho = produtor.localizacao?.nomeConcelho;

  return (
    <section className="destaque-leilao" aria-labelledby="destaque-leilao">
      <Link
        className="destaque-direto"
        to={`/leiloes/${leilao.id}`}
        viewTransition
      >
        <span className="destaque-direto-selos">
          {aoVivo ? (
            <span className="selo selo-direto">Em direto</span>
          ) : (
            <span className="selo selo-no-painel">Próximo leilão</span>
          )}
          {leilao.exemplo && <span className="selo selo-exemplo">Exemplo</span>}
        </span>
        <ImagemProduto produto={leilao} className="destaque-direto-imagem" />
        {/* O "·" fica colado ao nome (espaço que não parte), para uma linha nunca começar por ele */}
        <h2 className="destaque-direto-nome" id="destaque-leilao">
          {nome}
          {'\u00a0· '}
          {lote}
        </h2>
        <p className="destaque-direto-origem">
          {produtor.nomeExploracao}
          {concelho && ` · ${concelho}`}
        </p>
        <span className="destaque-direto-numeros">
          <span>
            <span className="destaque-direto-rotulo">
              {numeroDeLicitacoes > 0 ? 'Licitação atual' : 'Preço base'}
            </span>
            <strong className="destaque-direto-valor">
              {formatarPreco(licitacaoAtual.valor)}
            </strong>
          </span>
          <span className="text-end">
            <span className="destaque-direto-rotulo">
              {aoVivo ? 'Termina em' : formatarDiaCurto(leilao.iniciaEm)}
            </span>
            <strong className="destaque-direto-tempo">
              {aoVivo
                ? formatarTempo(new Date(leilao.terminaEm).getTime() - agora)
                : `às ${formatarHora(leilao.iniciaEm)}`}
            </strong>
          </span>
        </span>
        <span className="destaque-direto-acao">
          {aoVivo ? 'Entrar na sala' : 'Ver o leilão'}
        </span>
      </Link>
      {aDecorrer.length > 1 && (
        <Link className="small d-inline-block mt-2" to="/leiloes">
          Mais {aDecorrer.length - 1}{' '}
          {aDecorrer.length === 2 ? 'leilão' : 'leilões'} a decorrer
        </Link>
      )}
    </section>
  );
}
