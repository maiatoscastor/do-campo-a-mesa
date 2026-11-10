import { model, Schema } from 'mongoose';

// Os motivos por que se pode denunciar uma avaliação. Uma avaliação negativa e honesta não é motivo:
// a denúncia é para o que não devia estar publicado.
export const MOTIVOS_DE_DENUNCIA = [
  'ofensiva', // linguagem ofensiva ou discriminatória
  'dados-pessoais', // telefone, morada ou outros dados de alguém
  'falsa', // falsa ou enganadora
  'publicidade', // publicidade ou spam
  'outro', // com a descrição obrigatória
];

// Uma denúncia de uma avaliação, feita por alguém com sessão. Fica numa coleção à parte (e não
// dentro da avaliação), porque cada uma tem o seu autor, o seu motivo e o seu estado, e o
// administrador lê-as todas juntas, de todos os produtores. A denúncia nunca esconde a avaliação
// sozinha: quem decide é o administrador.
const reportSchema = new Schema(
  {
    // Por agora, só avaliações (mais tarde, também produtores)
    tipo: { type: String, enum: ['avaliacao'], required: true },
    avaliacao: { type: Schema.Types.ObjectId, ref: 'Review', required: true },
    autor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    motivo: {
      type: String,
      required: [true, 'Escolha um motivo'],
      enum: { values: MOTIVOS_DE_DENUNCIA, message: 'Escolha um motivo' },
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: [500, 'A descrição é demasiado comprida'],
      required: [
        function () {
          return this.motivo === 'outro';
        },
        'Conte o que se passa',
      ],
    },
    // Por decidir até o administrador decidir sobre a avaliação; depois fica com a decisão
    estado: {
      type: String,
      enum: ['pendente', 'decidida'],
      default: 'pendente',
    },
    decisao: { type: String, enum: ['mantida', 'ocultada'] },
  },
  { timestamps: true },
);

// Cada pessoa denuncia cada avaliação uma só vez (mesmo com dois pedidos ao mesmo tempo). O índice
// só abrange as denúncias de avaliações, para as de outros tipos não colidirem umas com as outras.
reportSchema.index(
  { avaliacao: 1, autor: 1 },
  { unique: true, partialFilterExpression: { tipo: 'avaliacao' } },
);
// As denúncias por decidir, das mais antigas para as mais recentes
reportSchema.index({ estado: 1, createdAt: 1 });

export const Report = model('Report', reportSchema);
