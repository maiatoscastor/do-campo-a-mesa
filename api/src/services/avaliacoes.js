import mongoose from 'mongoose';
import { Review } from '../models/Review.js';

// As médias calculam-se sempre que são pedidas, a partir das avaliações visíveis, em vez de ficarem
// guardadas no produtor e nos produtos: assim nunca ficam desatualizadas (por exemplo, com duas
// avaliações ao mesmo tempo, ou quando o administrador oculta uma). O aggregate não converte os
// identificadores sozinho, por isso passam a ObjectId antes.

function umaCasaDecimal(numero) {
  return Math.round(numero * 10) / 10;
}

// O resumo das avaliações de um produtor: a média (com uma casa decimal), o total e quantas há de
// cada número de estrelas, para as barras da distribuição
export async function resumoDoProdutor(produtorId) {
  const grupos = await Review.aggregate([
    {
      $match: {
        produtor: new mongoose.Types.ObjectId(String(produtorId)),
        visivel: true,
      },
    },
    { $group: { _id: '$classificacao', quantas: { $sum: 1 } } },
  ]);
  const distribuicao = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let soma = 0;
  for (const { _id: estrelas, quantas } of grupos) {
    distribuicao[estrelas] = quantas;
    total += quantas;
    soma += estrelas * quantas;
  }
  return {
    media: total > 0 ? umaCasaDecimal(soma / total) : null,
    total,
    distribuicao,
  };
}

// A média e o número de notas de cada produto, num Map do identificador do produto para
// { media, total }. Os produtos sem notas não aparecem no Map.
export async function mediasDosProdutos(ids) {
  if (ids.length === 0) {
    return new Map();
  }
  const produtos = ids.map((id) => new mongoose.Types.ObjectId(String(id)));
  const grupos = await Review.aggregate([
    { $match: { visivel: true, 'produtos.produto': { $in: produtos } } },
    // Uma linha por produto avaliado, para agrupar por produto
    { $unwind: '$produtos' },
    { $match: { 'produtos.produto': { $in: produtos } } },
    {
      $group: {
        _id: '$produtos.produto',
        media: { $avg: '$produtos.classificacao' },
        total: { $sum: 1 },
      },
    },
  ]);
  return new Map(
    grupos.map(({ _id, media, total }) => [
      _id.toString(),
      { media: umaCasaDecimal(media), total },
    ]),
  );
}
