import mongoose from 'mongoose';
import { Auction, ESTADOS_POR_ACABAR } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { CAMPOS_DO_PRODUTOR } from '../routes/auctions.js';
import { formatarEuros, temAteDoisDecimais } from '../utils/dinheiro.js';
import { nomeCurto } from '../utils/nomes.js';

// Uma licitação a menos de 30 segundos do fim prolonga o leilão até 30 segundos depois dela
export const PROLONGAMENTO = 30 * 1000;

// Cada leilão tem a sua sala: o que lá se passa só chega a quem o está a ver
export function sala(leilaoId) {
  return `leilao:${leilaoId}`;
}

function eIdentificador(valor) {
  return typeof valor === 'string' && mongoose.isObjectIdOrHexString(valor);
}

// Os erros dos tratadores async não chegam a lado nenhum no Socket.io e deitariam o servidor abaixo:
// ficam registados no servidor, e quem pediu recebe uma resposta genérica
function seguro(tratar) {
  return async (...argumentos) => {
    try {
      await tratar(...argumentos);
    } catch (erro) {
      console.error(erro);
      const responder = argumentos.at(-1);
      if (typeof responder === 'function') {
        responder({ ok: false, erro: 'Erro interno do servidor' });
      }
    }
  };
}

// Presença: quantas pessoas estão a ver o leilão. Cada utilizador conta uma vez, mesmo com vários
// separadores abertos; cada visitante sem conta conta como uma pessoa. "aSair" é o socket que está a
// desligar-se e que ainda aparece na sala.
async function emitirPresenca(io, leilaoId, aSair) {
  const sockets = await io.in(sala(leilaoId)).fetchSockets();
  const pessoas = new Set(
    sockets
      .filter(({ id }) => id !== aSair)
      .map(({ id, data }) => data.utilizador?.id ?? id),
  );
  io.to(sala(leilaoId)).emit('presenca', pessoas.size);
}

// O motivo por que uma licitação não foi aceite, lido depois de a operação atómica falhar
function motivoDaRecusa(leilao, utilizador, agora) {
  if (!leilao) {
    return 'Leilão não encontrado';
  }
  if (leilao.produtor.equals(utilizador.id)) {
    return 'Não pode licitar no seu próprio leilão';
  }
  if (leilao.iniciaEm > agora) {
    return 'O leilão ainda não começou';
  }
  if (leilao.estado === 'cancelado') {
    return 'O leilão foi cancelado';
  }
  if (leilao.estado === 'terminado' || leilao.terminaEm <= agora) {
    return 'O leilão já terminou';
  }
  if (leilao.licitacaoAtual.comprador?.equals(utilizador.id)) {
    return 'A sua licitação já é a mais alta';
  }
  return `A licitação mínima é agora ${formatarEuros(leilao.minimo())}`;
}

// Os eventos dos leilões de um socket. Os nomes seguem a tabela de eventos entre cliente e servidor.
export function registarLeiloes(io, socket) {
  // entrar: abrir a sala de um leilão. Recebe o estado atual, com a hora do servidor ("agora"), para
  // o cliente acertar a contagem decrescente com o relógio do servidor.
  socket.on(
    'entrar',
    seguro(async (leilaoId) => {
      const leilao = eIdentificador(leilaoId)
        ? await Auction.findById(leilaoId).populate(
            'produtor',
            CAMPOS_DO_PRODUTOR,
          )
        : null;
      if (!leilao) {
        socket.emit('recusada', 'Leilão não encontrado');
        return;
      }
      await socket.join(sala(leilaoId));
      const licitacoes = await Bid.find({ leilao: leilaoId })
        .sort({ ordem: -1 })
        .limit(20);
      socket.emit('estado', {
        agora: new Date(),
        leilao: leilao.publico(),
        licitacoes: licitacoes.map((licitacao) => licitacao.publico()),
      });
      await emitirPresenca(io, leilaoId);
    }),
  );

  // sair: fechar a sala (por exemplo, ao mudar de página)
  socket.on(
    'sair',
    seguro(async (leilaoId) => {
      if (!eIdentificador(leilaoId)) {
        return;
      }
      await socket.leave(sala(leilaoId));
      await emitirPresenca(io, leilaoId);
    }),
  );

  // Ao fechar o separador ou perder a ligação, os outros veem a presença atualizada
  socket.on('disconnecting', () => {
    for (const nome of socket.rooms) {
      if (nome.startsWith('leilao:')) {
        emitirPresenca(io, nome.slice('leilao:'.length), socket.id).catch(
          (erro) => console.error(erro),
        );
      }
    }
  });

  // licitar: { leilaoId, valor }. A resposta (ack) diz se foi aceite; sem ack, a recusa chega pelo
  // evento "recusada".
  socket.on(
    'licitar',
    seguro(async (dados, responder) => {
      const recusar = (erro) =>
        typeof responder === 'function'
          ? responder({ ok: false, erro })
          : socket.emit('recusada', erro);
      const { utilizador } = socket.data;
      const { leilaoId, valor } = dados ?? {};

      if (!utilizador) {
        return recusar('Entre na sua conta para licitar');
      }
      if (utilizador.papel === 'admin') {
        return recusar('As contas de administrador não licitam');
      }
      if (!eIdentificador(leilaoId)) {
        return recusar('Leilão não encontrado');
      }
      if (
        typeof valor !== 'number' ||
        !(valor > 0) ||
        !temAteDoisDecimais(valor)
      ) {
        return recusar('Indique um valor em euros, com até dois decimais');
      }

      // O desafio central: duas licitações quase ao mesmo tempo. A condição e a gravação são uma só
      // operação atómica no MongoDB: o leilão tem de estar a decorrer e o valor tem de chegar ao
      // mínimo (o preço base na primeira licitação, a licitação atual + incremento nas outras).
      // Se outra licitação chegou primeiro, a condição já não se cumpre e esta é recusada.
      const agora = new Date();
      const leilao = await Auction.findOneAndUpdate(
        {
          _id: leilaoId,
          estado: { $in: ESTADOS_POR_ACABAR },
          iniciaEm: { $lte: agora },
          terminaEm: { $gt: agora },
          produtor: { $ne: utilizador.id },
          // Quem já tem a licitação mais alta não licita sobre si próprio
          'licitacaoAtual.comprador': { $ne: utilizador.id },
          $expr: {
            $cond: [
              { $eq: ['$numeroDeLicitacoes', 0] },
              { $gte: [valor, '$precoBase'] },
              {
                $gte: [
                  valor,
                  {
                    $round: [
                      { $add: ['$licitacaoAtual.valor', '$incremento'] },
                      2,
                    ],
                  },
                ],
              },
            ],
          },
        },
        // Uma atualização em "pipeline", para a nova hora de fim poder depender da que lá está: uma
        // licitação nos últimos 30 segundos empurra o fim para daqui a 30 segundos, e assim ninguém
        // ganha à última hora sem os outros poderem responder. Tudo na mesma operação atómica. O
        // Mongoose não converte os valores de um pipeline, e o $literal impede que um texto que
        // comece por "$" seja lido como um campo.
        [
          {
            $set: {
              licitacaoAtual: {
                valor: { $literal: valor },
                comprador: {
                  $literal: new mongoose.Types.ObjectId(utilizador.id),
                },
                nome: { $literal: nomeCurto(utilizador.nome) },
                data: { $literal: agora },
              },
              numeroDeLicitacoes: { $add: ['$numeroDeLicitacoes', 1] },
              terminaEm: {
                $max: ['$terminaEm', new Date(agora.getTime() + PROLONGAMENTO)],
              },
            },
          },
        ],
        { returnDocument: 'after', updatePipeline: true },
      );

      if (!leilao) {
        return recusar(
          motivoDaRecusa(await Auction.findById(leilaoId), utilizador, agora),
        );
      }

      // Só depois de aceite é que a licitação vai para o histórico e é anunciada a toda a sala
      const licitacao = await Bid.create({
        leilao: leilao._id,
        comprador: utilizador.id,
        nome: leilao.licitacaoAtual.nome,
        valor,
        ordem: leilao.numeroDeLicitacoes,
      });
      io.to(sala(leilaoId)).emit('nova-licitacao', {
        licitacao: licitacao.publico(),
        licitacaoAtual: leilao.licitacaoAtual,
        numeroDeLicitacoes: leilao.numeroDeLicitacoes,
        minimo: leilao.minimo(),
        terminaEm: leilao.terminaEm,
      });
      if (typeof responder === 'function') {
        responder({ ok: true });
      }
    }),
  );
}
