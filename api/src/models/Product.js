import { model, Schema } from 'mongoose';
import { temAteDoisDecimais } from '../utils/dinheiro.js';

export const CATEGORIAS = [
  'Hortícolas',
  'Fruta',
  'Mel',
  'Vinho',
  'Queijo',
  'Padaria',
  'Outros',
];

export const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno'];

// O produtor é uma referência (e não um subdocumento), porque cada produtor tem muitos produtos e os
// dados dele mudam sem que os produtos tenham de mudar.
const productSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, 'Indique o nome do produto'],
      trim: true,
      maxlength: [100, 'O nome é demasiado comprido'],
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: [1000, 'A descrição é demasiado comprida'],
    },
    categoria: {
      type: String,
      required: [true, 'Escolha a categoria'],
      enum: { values: CATEGORIAS, message: 'Escolha a categoria' },
    },
    // Em euros, com no máximo duas casas decimais
    preco: {
      type: Number,
      required: [true, 'Indique o preço'],
      min: [0.01, 'O preço tem de ser maior do que zero'],
      max: [10000, 'O preço é demasiado alto'],
      validate: {
        validator: temAteDoisDecimais,
        message: 'O preço só pode ter até dois decimais',
      },
    },
    // A quantidade a que o preço se refere: kg, dúzia, garrafa de 75 cl…
    unidade: {
      type: String,
      required: [true, 'Indique a unidade (por exemplo, kg ou dúzia)'],
      trim: true,
      maxlength: [30, 'A unidade é demasiado comprida'],
    },
    stock: {
      type: Number,
      required: [true, 'Indique o stock'],
      min: [0, 'O stock não pode ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'O stock tem de ser um número inteiro',
      },
    },
    biologico: { type: Boolean, default: false },
    // Sem épocas, o produto existe todo o ano
    epocas: {
      type: [
        { type: String, enum: { values: EPOCAS, message: 'Época inválida' } },
      ],
      default: [],
    },
    produtor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    imagemUrl: String,
    // Dados inventados para testar, sempre identificados como tal na aplicação
    exemplo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Product = model('Product', productSchema);
