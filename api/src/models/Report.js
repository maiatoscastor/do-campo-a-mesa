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

// Os motivos por que se pode denunciar um produtor
export const MOTIVOS_DE_DENUNCIA_DE_PRODUTOR = [
  'nao-entregou', // não entregou uma encomenda
  'diferente', // os produtos eram diferentes do anunciado
  'informacao-falsa', // por exemplo, diz que é biológico e não é
  'ofensivo', // conteúdo ofensivo na página
  'outro', // com a descrição obrigatória
];

// As decisões do administrador: numa avaliação, mantê-la ou ocultá-la; num produtor, rejeitar a
// denúncia, dar um aviso, suspender a conta de produtor ou bani-lo (bloquear a conta)
export const DECISOES_DE_AVALIACAO = ['mantida', 'ocultada'];
export const DECISOES_DE_PRODUTOR = [
  'rejeitada',
  'aviso',
  'suspensao',
  'banimento',
];

// Uma denúncia de uma avaliação ou de um produtor, feita por alguém com sessão. Fica numa coleção à
// parte, porque cada uma tem o seu autor, o seu motivo e o seu estado, e o administrador lê-as todas
// juntas, de todos os produtores. A denúncia nunca muda nada sozinha: quem decide é o administrador.
const reportSchema = new Schema(
  {
    tipo: { type: String, enum: ['avaliacao', 'produtor'], required: true },
    avaliacao: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: [
        function () {
          return this.tipo === 'avaliacao';
        },
        'Falta a avaliação',
      ],
    },
    produtor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [
        function () {
          return this.tipo === 'produtor';
        },
        'Falta o produtor',
      ],
    },
    autor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Cada tipo tem a sua lista de motivos
    motivo: {
      type: String,
      required: [true, 'Escolha um motivo'],
      validate: {
        validator(motivo) {
          const motivos =
            this.tipo === 'produtor'
              ? MOTIVOS_DE_DENUNCIA_DE_PRODUTOR
              : MOTIVOS_DE_DENUNCIA;
          return motivos.includes(motivo);
        },
        message: 'Escolha um motivo',
      },
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
    // Por decidir até o administrador decidir; depois fica com a decisão
    estado: {
      type: String,
      enum: ['pendente', 'decidida'],
      default: 'pendente',
    },
    decisao: {
      type: String,
      enum: [...DECISOES_DE_AVALIACAO, ...DECISOES_DE_PRODUTOR],
    },
    // Nas denúncias de produtores, o motivo e a data da decisão ficam aqui (nas de avaliações, ficam
    // na própria avaliação)
    motivoDaDecisao: { type: String, trim: true, maxlength: 500 },
    decididaEm: Date,
  },
  { timestamps: true },
);

// Cada pessoa denuncia cada avaliação uma só vez (mesmo com dois pedidos ao mesmo tempo). O índice
// só abrange as denúncias de avaliações, para as de outros tipos não colidirem umas com as outras.
reportSchema.index(
  { avaliacao: 1, autor: 1 },
  { unique: true, partialFilterExpression: { tipo: 'avaliacao' } },
);
// Num produtor, cada pessoa só tem uma denúncia por decidir de cada vez: depois da decisão, pode
// voltar a denunciar, se o problema se repetir
reportSchema.index(
  { produtor: 1, autor: 1 },
  {
    unique: true,
    partialFilterExpression: { tipo: 'produtor', estado: 'pendente' },
  },
);
// As denúncias por decidir, das mais antigas para as mais recentes
reportSchema.index({ estado: 1, createdAt: 1 });

export const Report = model('Report', reportSchema);
