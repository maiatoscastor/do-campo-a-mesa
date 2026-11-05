import { model, Schema } from 'mongoose';
import { CATEGORIAS } from './Product.js';
import { arredondar, temAteDoisDecimais } from '../utils/dinheiro.js';

export const ESTADOS_DO_LEILAO = ['agendado', 'ativo', 'terminado'];

// Um valor em euros, maior do que zero e com até dois decimais
function dinheiro(nome, maximo) {
  return {
    type: Number,
    required: [true, `Indique o ${nome}`],
    min: [0.01, `O ${nome} tem de ser maior do que zero`],
    max: [maximo, `O ${nome} é demasiado alto`],
    validate: {
      validator: temAteDoisDecimais,
      message: `O ${nome} só pode ter até dois decimais`,
    },
  };
}

// A maior licitação até agora. Fica embebida no leilão (e não só na coleção bids) porque é isso que
// permite validar e gravar uma licitação numa única operação atómica: o filtro e a alteração
// acontecem juntos no mesmo documento, sem outro pedido pelo meio.
const licitacaoAtualSchema = new Schema(
  {
    valor: Number,
    comprador: { type: Schema.Types.ObjectId, ref: 'User' },
    nome: String,
    data: Date,
  },
  { _id: false },
);

// Um lote vendido em leilão: um excedente ou um lote sazonal de um dos produtos do produtor. O nome,
// a categoria e a fotografia do produto são copiados ao criar o leilão, para o leilão continuar
// igual mesmo que o produto mude. O leilão não mexe no stock do produto: o lote é à parte.
const auctionSchema = new Schema(
  {
    produtor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    produto: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Escolha um dos seus produtos'],
    },
    nome: { type: String, required: true },
    categoria: { type: String, enum: CATEGORIAS, required: true },
    imagemUrl: String,
    lote: {
      type: String,
      required: [true, 'Diga o que tem o lote (por exemplo, 200 kg)'],
      trim: true,
      maxlength: [150, 'A descrição do lote é demasiado comprida'],
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: [1000, 'A descrição é demasiado comprida'],
    },
    precoBase: dinheiro('preço base', 100000),
    incremento: dinheiro('incremento', 10000),
    licitacaoAtual: { type: licitacaoAtualSchema, default: () => ({}) },
    numeroDeLicitacoes: { type: Number, default: 0 },
    iniciaEm: { type: Date, required: true },
    terminaEm: { type: Date, required: true, index: true },
    estado: {
      type: String,
      enum: ESTADOS_DO_LEILAO,
      default: 'agendado',
      index: true,
    },
    // A encomenda criada para o vencedor quando o leilão acaba
    encomenda: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: true },
);

// A licitação atual começa no preço base, ainda sem comprador
auctionSchema.pre('validate', function comecarNoPrecoBase() {
  if (this.isNew) {
    this.licitacaoAtual = { valor: this.precoBase };
  }
});

// O valor mínimo da próxima licitação: a primeira pode ser o preço base; as seguintes têm de subir
// pelo menos o incremento
auctionSchema.methods.minimo = function minimo() {
  return this.numeroDeLicitacoes === 0
    ? this.precoBase
    : arredondar(this.licitacaoAtual.valor + this.incremento);
};

// O que se envia ao cliente. O produtor, quando foi carregado (populate), vem só com os dados que
// interessam a quem vê o leilão.
auctionSchema.methods.publico = function publico() {
  const { _id, produtor, ...resto } = this.toObject({ versionKey: false });
  // A encomenda do vencedor só interessa a ele e ao produtor, que a veem nas encomendas
  delete resto.encomenda;
  return {
    id: _id,
    ...resto,
    minimo: this.minimo(),
    produtor: produtor?.produtor
      ? {
          id: produtor._id,
          nomeExploracao: produtor.produtor.nomeExploracao,
          localizacao: produtor.produtor.localizacao,
        }
      : produtor,
  };
};

export const Auction = model('Auction', auctionSchema);
