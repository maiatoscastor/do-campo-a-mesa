import mongoose from 'mongoose';
import { Auction, ESTADOS_POR_ACABAR } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { ESTADOS_POR_ENTREGAR, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { avisar, avisarPainel } from '../sockets/avisos.js';
import { sala } from '../sockets/leiloes.js';
import { formatarDataHora } from '../utils/datas.js';

// De quanto em quanto tempo se procuram as suspensões que chegaram ao fim. O fim conta logo à hora
// certa em todo o lado (a loja compara a data); o ciclo só tira o castigo guardado e avisa o produtor.
const INTERVALO = 60 * 1000;

// Cancela os leilões de um produtor que ainda não acabaram. Cada um numa transação: o leilão passa a
// "cancelado" (só se ainda estiver por acabar, para não colidir com o fecho) e o lote que tinha saído
// do stock volta ao produto. Quem está na sala vê-o logo, e quem licitou recebe uma notificação.
export async function cancelarLeiloesDe(io, produtorId) {
  const lista = await Auction.find({
    produtor: produtorId,
    estado: { $in: ESTADOS_POR_ACABAR },
  }).select('_id');

  for (const { _id } of lista) {
    let cancelado = null;
    await mongoose.connection.transaction(async (session) => {
      cancelado = await Auction.findOneAndUpdate(
        { _id, estado: { $in: ESTADOS_POR_ACABAR } },
        { estado: 'cancelado', canceladoEm: new Date() },
        { session, returnDocument: 'after' },
      );
      if (cancelado?.doStock) {
        await Product.updateOne(
          { _id: cancelado.produto },
          { $inc: { stock: cancelado.quantidade } },
          { session },
        );
      }
    });
    if (!cancelado) {
      continue;
    }

    io?.to(sala(_id)).emit('cancelado', { id: _id });
    const licitadores = await Bid.distinct('comprador', { leilao: _id });
    for (const comprador of licitadores) {
      await avisar(
        io,
        comprador,
        {
          texto: `O leilão de ${cancelado.nome} (${cancelado.lote}) foi cancelado. As licitações deixaram de contar.`,
          tipo: 'leilao',
          ligacao: `/leiloes/${_id}`,
        },
        'leilao-terminado',
        { id: _id },
      );
    }
  }
}

// Suspende a conta de produtor até uma data: os produtos e a página saem da loja (todas as consultas
// usam produtoresAVender), os leilões por acabar são cancelados, e o produtor é avisado com o motivo.
// Suspender quem já está suspenso muda a data e o motivo.
export async function suspender(io, produtor, { ate, motivo, admin }) {
  produtor.castigo = {
    tipo: 'suspensao',
    ate,
    motivo,
    desde: new Date(),
    admin,
  };
  await produtor.save({ validateModifiedOnly: true });
  await cancelarLeiloesDe(io, produtor._id);
  await avisar(
    io,
    produtor._id,
    {
      texto: `A sua conta de produtor foi suspensa até ${formatarDataHora(ate)}: até lá, os seus produtos e a sua página não aparecem na loja, e não pode criar produtos nem leilões. Motivo: ${motivo}`,
      tipo: 'conta',
      ligacao: '/',
    },
    'conta-mudou',
    {},
  );
  await avisarPainel(io);
}

// Cancela as encomendas que o produtor ainda não entregou. Cada uma numa transação: passa a
// "cancelada" (só se ainda estiver por entregar, para não colidir com o produtor a marcá-la como
// entregue) e o stock volta aos produtos, para o caso de o castigo ser levantado. Numa encomenda da
// loja, o stock tinha descido ao encomendar; numa de leilão, só tinha descido se o lote saiu do
// stock. O comprador recebe uma notificação.
export async function cancelarEncomendasDe(io, produtorId, nome) {
  const lista = await Order.find({
    produtor: produtorId,
    estado: { $in: ESTADOS_POR_ENTREGAR },
  }).select('_id');

  for (const { _id } of lista) {
    let cancelada = null;
    await mongoose.connection.transaction(async (session) => {
      const agora = new Date();
      cancelada = await Order.findOneAndUpdate(
        { _id, estado: { $in: ESTADOS_POR_ENTREGAR } },
        {
          estado: 'cancelada',
          $push: { historico: { estado: 'cancelada', data: agora } },
        },
        { session, returnDocument: 'after' },
      );
      if (!cancelada) {
        return;
      }
      let devolver = cancelada.origem === 'loja';
      if (cancelada.origem === 'leilao') {
        const leilao = await Auction.findOne({ encomenda: _id })
          .select('doStock')
          .session(session);
        devolver = Boolean(leilao?.doStock);
      }
      if (devolver) {
        for (const { produto, quantidade } of cancelada.linhas) {
          await Product.updateOne(
            { _id: produto },
            { $inc: { stock: quantidade } },
            { session },
          );
        }
      }
    });
    if (!cancelada) {
      continue;
    }
    await avisar(
      io,
      cancelada.comprador,
      {
        texto: `A sua encomenda a ${nome} foi cancelada: o produtor deixou de vender na aplicação.`,
        tipo: 'encomenda',
        ligacao: '/encomendas',
      },
      'encomenda-atualizada',
      { id: _id },
    );
  }
}

// Bane o produtor: a conta fica bloqueada (não volta a entrar, e as rotas de comprar, vender e
// licitar recusam-no mesmo com um token ainda válido), os produtos e a página saem da loja, os
// leilões por acabar são cancelados e as encomendas por entregar também. Avisa-o com o motivo; o
// aviso faz a aplicação dele ler outra vez a conta, e essa leitura termina a sessão.
export async function banir(io, produtor, { motivo, admin }) {
  produtor.castigo = { tipo: 'banimento', motivo, desde: new Date(), admin };
  await produtor.save({ validateModifiedOnly: true });
  await cancelarLeiloesDe(io, produtor._id);
  await cancelarEncomendasDe(
    io,
    produtor._id,
    produtor.produtor.nomeExploracao,
  );
  await avisar(
    io,
    produtor._id,
    {
      texto: `A sua conta foi bloqueada pelo administrador: os seus produtos e a sua página saíram da loja, e as encomendas por entregar foram canceladas. Motivo: ${motivo}`,
      tipo: 'conta',
      ligacao: '/',
    },
    'conta-mudou',
    {},
  );
  await avisarPainel(io);
}

// Tira o castigo e avisa o produtor: quando o administrador o levanta mais cedo, ou quando chega ao
// fim. A condição (o castigo ainda lá está e, no fim do prazo, a data já passou) e a mudança são uma
// só operação, por isso o produtor é avisado uma só vez, mesmo com várias instâncias da API.
export async function tirarCastigo(
  io,
  produtorId,
  { noFimDoPrazo = false } = {},
) {
  const filtro = { _id: produtorId, 'castigo.tipo': { $exists: true } };
  if (noFimDoPrazo) {
    filtro['castigo.ate'] = { $lte: new Date() };
  }
  const antes = await User.findOneAndUpdate(filtro, {
    $unset: { castigo: 1 },
  });
  if (!antes) {
    return false;
  }
  let texto =
    'A suspensão da sua conta de produtor foi levantada pelo administrador. Os seus produtos e a sua página voltaram à loja.';
  if (noFimDoPrazo) {
    texto =
      'A suspensão da sua conta de produtor terminou. Os seus produtos e a sua página voltaram à loja.';
  } else if (antes.castigo.tipo === 'banimento') {
    texto =
      'A sua conta foi desbloqueada pelo administrador. Os seus produtos e a sua página voltaram à loja.';
  }
  await avisar(
    io,
    produtorId,
    {
      texto,
      tipo: 'conta',
      ligacao: '/',
    },
    'conta-mudou',
    {},
  );
  await avisarPainel(io);
  return true;
}

// O ciclo que tira as suspensões que chegaram ao fim, de minuto a minuto
export function iniciarCicloCastigos(io) {
  let aCorrer = false;
  return setInterval(async () => {
    if (aCorrer) {
      return;
    }
    aCorrer = true;
    try {
      const acabadas = await User.find({
        'castigo.tipo': 'suspensao',
        'castigo.ate': { $lte: new Date() },
      }).select('_id');
      for (const { _id } of acabadas) {
        await tirarCastigo(io, _id, { noFimDoPrazo: true });
      }
    } catch (erro) {
      console.error(`Ciclo dos castigos: ${erro.message}`);
    } finally {
      aCorrer = false;
    }
  }, INTERVALO);
}
