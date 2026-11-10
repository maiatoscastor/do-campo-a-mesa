import { model, Schema } from 'mongoose';

// Um número inteiro de estrelas, de 1 a 5
function estrelas() {
  const mensagem = 'Escolha de 1 a 5 estrelas';
  return {
    type: Number,
    required: [true, mensagem],
    min: [1, mensagem],
    max: [5, mensagem],
    validate: { validator: Number.isInteger, message: mensagem },
  };
}

// As estrelas de um produto da encomenda. O nome fica guardado, como nas linhas da encomenda, para a
// avaliação continuar a dizer o que foi avaliado mesmo que o produto seja apagado.
const notaDoProdutoSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nome: { type: String, required: true },
    classificacao: estrelas(),
  },
  { _id: false },
);

// A resposta do produtor (uma por avaliação)
const respostaSchema = new Schema(
  {
    texto: {
      type: String,
      required: [true, 'Escreva a resposta'],
      trim: true,
      maxlength: [1000, 'A resposta é demasiado comprida'],
    },
    data: { type: Date, required: true },
  },
  { _id: false },
);

// A avaliação de uma encomenda entregue: as estrelas e o comentário são sobre o produtor (a
// experiência toda), e as estrelas de cada produto são opcionais. Fica numa coleção à parte, e não
// dentro do produtor, porque cresce sem limite e é lida e moderada sozinha. Cada encomenda só tem
// uma avaliação (índice único): mesmo com dois pedidos ao mesmo tempo, o segundo é recusado.
const reviewSchema = new Schema(
  {
    autor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    produtor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encomenda: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    classificacao: estrelas(),
    comentario: {
      type: String,
      trim: true,
      maxlength: [1000, 'O comentário é demasiado comprido'],
    },
    produtos: { type: [notaDoProdutoSchema], default: [] },
    resposta: respostaSchema,
    // O administrador pode ocultar uma avaliação denunciada: deixa de aparecer e de contar nas médias
    visivel: { type: Boolean, default: true },
    // Quando o autor a mudou pela última vez (a resposta do produtor não conta)
    editadaEm: Date,
  },
  { timestamps: true },
);

// As avaliações visíveis de um produtor, das mais recentes para as mais antigas
reviewSchema.index({ produtor: 1, visivel: 1, createdAt: -1 });
// As médias de cada produto
reviewSchema.index({ 'produtos.produto': 1 });

export const Review = model('Review', reviewSchema);
