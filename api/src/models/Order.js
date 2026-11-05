import { model, Schema } from 'mongoose';

// Os estados de uma encomenda, pela ordem em que acontecem
export const ESTADOS = ['pendente', 'confirmada', 'pronta', 'entregue'];

// Cada linha guarda o nome, a unidade e o preço do produto no momento da encomenda (embebidos):
// o produtor pode mudar o preço ou apagar o produto depois, e a encomenda tem de continuar a dizer
// o que foi combinado. A referência ao produto fica para se saber de onde veio.
const linhaSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nome: { type: String, required: true },
    unidade: { type: String, required: true },
    preco: { type: Number, required: true },
    quantidade: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

// Quando a encomenda passou a cada estado, para o comprador e o produtor verem as datas
const passoSchema = new Schema(
  {
    estado: { type: String, enum: ESTADOS, required: true },
    data: { type: Date, required: true },
  },
  { _id: false },
);

// Uma encomenda é sempre de um só produtor: um carrinho com produtos de vários produtores dá uma
// encomenda para cada um, porque cada produtor confirma e prepara a sua parte. O comprador e o
// produtor são referências, porque têm vida própria fora da encomenda.
const orderSchema = new Schema(
  {
    comprador: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    produtor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    linhas: {
      type: [linhaSchema],
      validate: {
        validator: (linhas) => linhas.length > 0,
        message: 'A encomenda não tem produtos',
      },
    },
    // Em euros, calculado no servidor a partir das linhas
    total: { type: Number, required: true, min: 0 },
    modo: {
      type: String,
      required: [true, 'Escolha levantamento ou entrega'],
      enum: {
        values: ['levantamento', 'entrega'],
        message: 'Escolha levantamento ou entrega',
      },
    },
    // Só para entregas
    morada: {
      type: String,
      trim: true,
      maxlength: [300, 'A morada é demasiado comprida'],
      required: [
        function precisaDeMorada() {
          return this.modo === 'entrega';
        },
        'Indique a morada de entrega',
      ],
    },
    estado: { type: String, enum: ESTADOS, default: 'pendente' },
    historico: { type: [passoSchema], default: [] },
    // Uma encomenda feita na loja, ou o lote de um leilão, criado para o vencedor quando o leilão acaba
    origem: { type: String, enum: ['loja', 'leilao'], default: 'loja' },
    leilao: { type: Schema.Types.ObjectId, ref: 'Auction' },
  },
  { timestamps: true },
);

export const Order = model('Order', orderSchema);
