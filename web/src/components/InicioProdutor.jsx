import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import AlertaDeErro from './AlertaDeErro.jsx';
import AtalhoInicio from './AtalhoInicio.jsx';
import { useEventoSocket } from '../hooks/useEventoSocket.js';
import { useSessao } from '../hooks/useSessao.js';
import { formatarMedia, textoDasAvaliacoes } from '../avaliacoes.js';
import { faseDoLeilao, formatarDia, formatarHora } from '../leiloes.js';
import { STOCK_BAIXO } from '../produtos.js';

// O que falta fazer a cada encomenda, como aparece no cartão ("2 por confirmar")
const POR_FAZER = {
  pendente: ['por confirmar', 'por confirmar'],
  confirmada: ['a preparar', 'a preparar'],
  pronta: ['pronta a entregar', 'prontas a entregar'],
};

function textoDasEncomendas(encomendas) {
  const partes = Object.entries(POR_FAZER)
    .map(([estado, [uma, varias]]) => {
      const quantas = encomendas.filter((e) => e.estado === estado).length;
      // O número e as palavras ficam juntos na mesma linha (espaços que não partem)
      const texto = (quantas === 1 ? uma : varias).replaceAll(' ', '\u00a0');
      return quantas > 0 && `${quantas}\u00a0${texto}`;
    })
    .filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Nada por tratar';
}

// Os produtos com 5 ou menos, primeiro os que têm menos: "Kiwi (2) · Mel (esgotado) e mais 1"
function textoDoStock(baixos) {
  if (baixos.length === 0) {
    return 'Todos os produtos com stock';
  }
  const nomes = baixos
    .slice(0, 2)
    .map(({ nome, stock }) => `${nome} (${stock === 0 ? 'esgotado' : stock})`)
    .join(' · ');
  return baixos.length > 2 ? `${nomes} e mais ${baixos.length - 2}` : nomes;
}

// O leilão a decorrer ou, se não houver, o próximo marcado
function textoDosLeiloes(leiloes) {
  const agora = Date.now();
  const aDecorrer = leiloes.filter((l) => faseDoLeilao(l, agora) === 'ativo');
  if (aDecorrer.length > 0) {
    return aDecorrer.length === 1
      ? `${aDecorrer[0].nome}: a decorrer agora`
      : `${aDecorrer.length} a decorrer agora`;
  }
  const [proximo] = leiloes
    .filter((l) => faseDoLeilao(l, agora) === 'agendado')
    .sort((a, b) => new Date(a.iniciaEm) - new Date(b.iniciaEm));
  if (!proximo) {
    return 'Nenhum marcado';
  }
  return `Próximo: ${proximo.nome}, ${formatarDia(proximo.iniciaEm).toLowerCase()} às ${formatarHora(proximo.iniciaEm)}`;
}

// O início do produtor: só o que precisa da atenção dele (encomendas por tratar, stock baixo,
// leilões e a nota das avaliações) e os dois atalhos para vender. Antes de ser aprovado, só o aviso
// e a ligação para preparar a página.
export default function InicioProdutor() {
  const { utilizador, pedir } = useSessao();
  const aprovado = utilizador.produtor?.validacao === 'aprovado';
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  // Muda para voltar a ler tudo (por exemplo, quando chega uma encomenda nova)
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao((n) => n + 1);
  useEventoSocket('nova-encomenda', recarregar);
  useEventoSocket('leilao-terminado', recarregar);
  useEventoSocket('nova-avaliacao', recarregar);

  useEffect(() => {
    if (!aprovado) {
      return undefined;
    }
    let cancelado = false;
    Promise.all([
      pedir('/orders/recebidas'),
      pedir('/products/meus'),
      pedir('/auctions/meus'),
      pedir('/producers/eu'),
    ])
      .then(([encomendas, produtos, leiloes, pagina]) => {
        if (!cancelado) {
          setDados({ encomendas, produtos, leiloes, pagina });
        }
      })
      .catch((problema) => !cancelado && setErro(problema));
    return () => {
      cancelado = true;
    };
  }, [aprovado, pedir, versao]);

  if (!aprovado) {
    return (
      <>
        <div className="alert alert-warning" role="status">
          {utilizador.produtor?.validacao === 'rejeitado'
            ? 'A sua conta de produtor não foi aprovada.'
            : 'A sua conta de produtor está à espera de validação. Quando for aprovada, pode publicar produtos e leilões.'}
        </div>
        <div className="row row-cols-1 row-cols-md-2 g-3">
          <div className="col">
            <AtalhoInicio
              caminho="/conta/quinta"
              icone="quinta"
              titulo="A minha página"
              texto="Prepare a página da quinta enquanto espera"
            />
          </div>
        </div>
      </>
    );
  }

  const carregar = (calcular) => (dados ? calcular(dados) : 'A carregar…');
  const porTratar =
    dados?.encomendas.filter(({ estado }) => estado !== 'entregue') ?? [];
  const baixos = (dados?.produtos ?? [])
    .filter(({ stock }) => stock <= STOCK_BAIXO)
    .sort((a, b) => a.stock - b.stock);
  const atalhos = [
    {
      caminho: '/conta/encomendas',
      icone: 'encomendas',
      titulo: 'Encomendas por tratar',
      texto: carregar(() => textoDasEncomendas(porTratar)),
      // A bola vermelha conta as que esperam pela confirmação dele
      numero: porTratar.filter(({ estado }) => estado === 'pendente').length,
      sufixo: 'por confirmar',
    },
    {
      caminho: '/conta/produtos',
      icone: 'caixa',
      titulo: 'Stock baixo',
      texto: carregar(({ produtos }) =>
        produtos.length === 0 ? 'Ainda não tem produtos' : textoDoStock(baixos),
      ),
      numero: baixos.length,
      sufixo: 'com stock baixo',
    },
    {
      caminho: '/conta/leiloes',
      icone: 'leiloes',
      titulo: 'Os meus leilões',
      texto: carregar(({ leiloes }) => textoDosLeiloes(leiloes)),
    },
    {
      caminho: `/produtores/${utilizador.id}/avaliacoes`,
      icone: 'estrela',
      titulo: 'Avaliações',
      texto: carregar(({ pagina }) =>
        pagina.avaliacao?.total > 0
          ? `${formatarMedia(pagina.avaliacao.media)} de 5 · ${textoDasAvaliacoes(pagina.avaliacao.total)}`
          : 'Ainda sem avaliações',
      ),
    },
  ];

  return (
    <>
      <AlertaDeErro erro={erro} />
      <div className="row row-cols-1 row-cols-md-2 g-3">
        {atalhos.map((atalho) => (
          <div className="col" key={atalho.caminho}>
            <AtalhoInicio {...atalho} />
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap gap-2 mt-4">
        <Link className="btn btn-primary" to="/conta/produtos/novo">
          Novo produto
        </Link>
        <Link className="btn btn-suave" to="/conta/leiloes/novo">
          Novo leilão
        </Link>
      </div>
    </>
  );
}
