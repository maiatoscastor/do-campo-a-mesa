import { model, Schema } from 'mongoose';

// Cada licitação aceite, para o histórico do leilão. Fica numa coleção própria (referenciada, e não
// embebida no leilão), porque um leilão pode ter muitas licitações e só se mostram as mais recentes.
const bidSchema = new Schema(
  {
    leilao: { type: Schema.Types.ObjectId, ref: 'Auction', required: true },
    comprador: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Como o nome aparece no histórico ("Ana T."), copiado para não ter de ir buscar o utilizador
    nome: { type: String, required: true },
    valor: { type: Number, required: true },
    // A posição em que foi aceite (1.ª, 2.ª…), dada pela mesma operação atómica que a aceitou. Com
    // licitações ao mesmo tempo, a ordem de gravação no histórico pode trocar-se; esta não.
    ordem: { type: Number, required: true },
  },
  { timestamps: true },
);

// O histórico lê-se pela ordem de aceitação, e cada posição só existe uma vez em cada leilão
bidSchema.index({ leilao: 1, ordem: -1 }, { unique: true });

// O que se envia ao cliente
bidSchema.methods.publico = function publico() {
  return {
    id: this._id,
    comprador: this.comprador,
    nome: this.nome,
    valor: this.valor,
    ordem: this.ordem,
    data: this.createdAt,
  };
};

export const Bid = model('Bid', bidSchema);
