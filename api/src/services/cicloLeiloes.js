import mongoose from 'mongoose';
import { Auction } from '../models/Auction.js';
import { Order } from '../models/Order.js';
import { sala } from '../sockets/leiloes.js';

// De quanto em quanto tempo se abrem e fecham os leilões. As licitações não dependem disto: a
// operação atómica confirma sempre a hora de início e de fim.
const INTERVALO = 2000;

// Abre os leilões agendados cuja hora chegou e avisa quem está na sala
export async function abrirAgendados(io) {
  const agora = new Date();
  const lista = await Auction.find({
    estado: 'agendado',
    iniciaEm: { $lte: agora },
  }).select('_id');
  for (const { _id } of lista) {
    const aberto = await Auction.findOneAndUpdate(
      { _id, estado: 'agendado' },
      { estado: 'ativo' },
    );
    if (aberto) {
      io.to(sala(_id)).emit('aberto', { id: _id });
    }
  }
}

// Fecha os leilões cujo tempo acabou. Cada fecho só acontece se o leilão ainda não estiver terminado,
// por isso, mesmo com várias instâncias da API, só uma fecha cada leilão. Se houve licitações, o
// vencedor recebe uma encomenda com o lote, já confirmada, criada na mesma transação: ou fica tudo
// gravado, ou nada (e o leilão volta a ser fechado na volta seguinte).
export async function fecharExpirados(io) {
  const agora = new Date();
  const lista = await Auction.find({
    estado: { $ne: 'terminado' },
    terminaEm: { $lte: agora },
  }).select('_id');

  for (const { _id } of lista) {
    let leilao;
    let encomenda = null;
    await mongoose.connection.transaction(async (session) => {
      encomenda = null;
      leilao = await Auction.findOneAndUpdate(
        // A hora volta a ser confirmada: o fim só conta se não tiver sido prolongado entretanto
        { _id, estado: { $ne: 'terminado' }, terminaEm: { $lte: agora } },
        { estado: 'terminado' },
        { session, returnDocument: 'after' },
      );
      if (!leilao || leilao.numeroDeLicitacoes === 0) {
        return;
      }
      const { comprador, valor } = leilao.licitacaoAtual;
      [encomenda] = await Order.create(
        [
          {
            comprador,
            produtor: leilao.produtor,
            linhas: [
              {
                produto: leilao.produto,
                nome: `${leilao.nome} (lote: ${leilao.lote})`,
                unidade: 'lote',
                preco: valor,
                quantidade: 1,
              },
            ],
            total: valor,
            modo: 'levantamento',
            estado: 'confirmada',
            historico: [{ estado: 'confirmada', data: agora }],
            origem: 'leilao',
            leilao: leilao._id,
          },
        ],
        { session },
      );
      leilao.encomenda = encomenda._id;
      await leilao.save({ session });
    });
    if (!leilao) {
      continue;
    }

    const resultado = {
      id: leilao._id,
      nome: leilao.nome,
      lote: leilao.lote,
      vencedor: encomenda ? leilao.licitacaoAtual.nome : null,
      valor: encomenda ? leilao.licitacaoAtual.valor : null,
    };
    io.to(sala(_id)).emit('terminado', resultado);
    io.to(`user:${leilao.produtor}`).emit('leilao-terminado', resultado);
    if (encomenda) {
      io.to(`user:${leilao.licitacaoAtual.comprador}`).emit('leilao-ganho', {
        ...resultado,
        encomenda: encomenda._id,
      });
    }
  }
}

// Corre o ciclo de 2 em 2 segundos, sem sobrepor uma volta lenta à seguinte. Um erro (por exemplo,
// a base de dados em baixo por instantes) fica registado e o ciclo continua.
export function iniciarCicloLeiloes(io) {
  let aCorrer = false;
  return setInterval(async () => {
    if (aCorrer) {
      return;
    }
    aCorrer = true;
    try {
      await abrirAgendados(io);
      await fecharExpirados(io);
    } catch (erro) {
      console.error(`Ciclo dos leilões: ${erro.message}`);
    } finally {
      aCorrer = false;
    }
  }, INTERVALO);
}
