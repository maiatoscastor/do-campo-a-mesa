import mongoose from 'mongoose';
import { Auction } from '../models/Auction.js';
import { Order } from '../models/Order.js';
import { arredondar } from '../utils/dinheiro.js';
import { resumoDoProdutor } from './avaliacoes.js';

const DIA = 24 * 60 * 60 * 1000;
const FUSO = 'Europe/Lisbon';

// Os períodos que se podem escolher, em dias, e como se agrupam as vendas no gráfico: por dia nos
// curtos, por semana nos 90 dias e por mês no ano. São janelas que acabam agora (os últimos N dias).
export const PERIODOS = {
  7: 'dia',
  30: 'dia',
  90: 'semana',
  365: 'mes',
};

// Os formatos do $dateToString do MongoDB para cada agrupamento (%G e %V são o ano e a semana ISO,
// que começa à segunda-feira)
const FORMATOS = { dia: '%Y-%m-%d', semana: '%G-W%V', mes: '%Y-%m' };

// O dia em Portugal de uma data, como [ano, mês, dia]
const PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function diaEmPortugal(data) {
  return PARTES.format(data).split('-').map(Number);
}

// A semana ISO de um dia ("2026-W46"), igual ao %G-W%V do MongoDB
function semanaIso(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  // Quinta-feira da mesma semana: é ela que diz a que ano a semana pertence
  const diaDaSemana = data.getUTCDay() || 7;
  data.setUTCDate(data.getUTCDate() + 4 - diaDaSemana);
  const inicioDoAno = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((data - inicioDoAno) / DIA + 1) / 7);
  return `${data.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

const doisDigitos = (n) => String(n).padStart(2, '0');

// As barras do gráfico, pela ordem do tempo, todas (também as que não tiveram vendas): a chave
// (igual à do MongoDB) e o primeiro dia de cada uma dentro do período ("inicio", AAAA-MM-DD). Os dias
// contam-se ao meio-dia UTC, que é sempre o mesmo dia em Portugal (UTC ou UTC+1).
function barrasDoPeriodo(dias, agrupamento, agora) {
  const [ano, mes, dia] = diaEmPortugal(agora);
  const hoje = Date.UTC(ano, mes - 1, dia, 12);
  const barras = [];
  for (let atras = dias - 1; atras >= 0; atras--) {
    const data = new Date(hoje - atras * DIA);
    const [a, m, d] = [
      data.getUTCFullYear(),
      data.getUTCMonth() + 1,
      data.getUTCDate(),
    ];
    const inicio = `${a}-${doisDigitos(m)}-${doisDigitos(d)}`;
    let chave = inicio;
    if (agrupamento === 'semana') {
      chave = semanaIso(a, m, d);
    } else if (agrupamento === 'mes') {
      chave = `${a}-${doisDigitos(m)}`;
    }
    if (barras.at(-1)?.chave !== chave) {
      barras.push({ chave, inicio });
    }
  }
  return barras;
}

// O total vendido e o número de encomendas num intervalo (as canceladas não contam)
async function vendasEntre(produtor, desde, ate) {
  const [grupo] = await Order.aggregate([
    {
      $match: {
        produtor,
        estado: { $ne: 'cancelada' },
        createdAt: { $gte: desde, $lt: ate },
      },
    },
    {
      $group: { _id: null, valor: { $sum: '$total' }, encomendas: { $sum: 1 } },
    },
  ]);
  const valor = arredondar(grupo?.valor ?? 0);
  const encomendas = grupo?.encomendas ?? 0;
  return {
    valor,
    encomendas,
    valorMedio: encomendas > 0 ? arredondar(valor / encomendas) : 0,
  };
}

// As estatísticas de um produtor nos últimos "dias": as vendas e o período anterior (para comparar),
// as vendas no gráfico, os produtos mais vendidos, as encomendas por estado, os leilões que
// acabaram e as avaliações (de sempre). Tudo calculado a partir das encomendas, dos leilões e das
// avaliações, no momento do pedido.
export async function estatisticasDoProdutor(
  produtorId,
  dias,
  agora = new Date(),
) {
  const produtor = new mongoose.Types.ObjectId(String(produtorId));
  const agrupamento = PERIODOS[dias];
  const desde = new Date(agora.getTime() - dias * DIA);
  const anteriorDesde = new Date(desde.getTime() - dias * DIA);
  const noPeriodo = { produtor, createdAt: { $gte: desde, $lt: agora } };

  const [vendas, anterior, porBarra, produtos, porEstado, leiloes, avaliacao] =
    await Promise.all([
      vendasEntre(produtor, desde, agora),
      vendasEntre(produtor, anteriorDesde, desde),
      Order.aggregate([
        { $match: { ...noPeriodo, estado: { $ne: 'cancelada' } } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: '$createdAt',
                format: FORMATOS[agrupamento],
                timezone: FUSO,
              },
            },
            valor: { $sum: '$total' },
            encomendas: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...noPeriodo, estado: { $ne: 'cancelada' } } },
        { $unwind: '$linhas' },
        {
          $group: {
            _id: '$linhas.produto',
            nome: { $last: '$linhas.nome' },
            unidade: { $last: '$linhas.unidade' },
            quantidade: { $sum: '$linhas.quantidade' },
            valor: {
              $sum: { $multiply: ['$linhas.preco', '$linhas.quantidade'] },
            },
          },
        },
        { $sort: { valor: -1, quantidade: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: noPeriodo },
        { $group: { _id: '$estado', quantas: { $sum: 1 } } },
      ]),
      Auction.find({
        produtor,
        estado: 'terminado',
        terminaEm: { $gte: desde, $lt: agora },
      }).select('numeroDeLicitacoes licitacaoAtual.valor'),
      resumoDoProdutor(produtor),
    ]);

  const somas = new Map(porBarra.map((barra) => [barra._id, barra]));
  const vendidos = leiloes.filter(
    ({ numeroDeLicitacoes }) => numeroDeLicitacoes > 0,
  );
  return {
    periodo: { dias, agrupamento, desde, ate: agora },
    vendas,
    anterior,
    serie: barrasDoPeriodo(dias, agrupamento, agora).map(
      ({ chave, inicio }) => ({
        chave,
        inicio,
        valor: arredondar(somas.get(chave)?.valor ?? 0),
        encomendas: somas.get(chave)?.encomendas ?? 0,
      }),
    ),
    produtos: produtos.map(({ _id, nome, unidade, quantidade, valor }) => ({
      id: _id,
      nome,
      unidade,
      quantidade,
      valor: arredondar(valor),
    })),
    estados: Object.fromEntries(
      porEstado.map(({ _id, quantas }) => [_id, quantas]),
    ),
    leiloes: {
      terminados: leiloes.length,
      vendidos: vendidos.length,
      valor: arredondar(
        vendidos.reduce(
          (soma, { licitacaoAtual }) => soma + licitacaoAtual.valor,
          0,
        ),
      ),
    },
    avaliacao,
  };
}
