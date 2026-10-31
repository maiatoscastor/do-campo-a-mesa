import { model, Schema } from 'mongoose';

// Os dez concelhos do Alto Minho, onde os produtores podem estar
export const LOCALIDADES = [
  'Arcos de Valdevez',
  'Caminha',
  'Melgaço',
  'Monção',
  'Paredes de Coura',
  'Ponte da Barca',
  'Ponte de Lima',
  'Valença',
  'Viana do Castelo',
  'Vila Nova de Cerveira',
];

// Dados que só os produtores têm. É um subdocumento (embebido), porque pertencem ao utilizador e
// são sempre lidos com ele; e o _id é desligado, porque nunca se procura um destes sozinho.
const produtorSchema = new Schema(
  {
    nomeExploracao: {
      type: String,
      required: [true, 'Indique o nome da exploração'],
      trim: true,
      maxlength: [100, 'O nome da exploração é demasiado comprido'],
    },
    localidade: {
      type: String,
      required: [true, 'Indique a localidade'],
      enum: {
        values: LOCALIDADES,
        message: 'Escolha um concelho do Alto Minho',
      },
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: [1000, 'A descrição é demasiado comprida'],
    },
    // Só um produtor aprovado pelo administrador pode publicar produtos
    validacao: {
      type: String,
      enum: ['pendente', 'aprovado', 'rejeitado'],
      default: 'pendente',
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    nome: {
      type: String,
      required: [true, 'Indique o nome'],
      trim: true,
      maxlength: [100, 'O nome é demasiado comprido'],
    },
    email: {
      type: String,
      required: [true, 'Indique o email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'O email não é válido'],
    },
    // select: false faz com que o hash nunca venha nas consultas, a não ser quando é pedido
    passwordHash: { type: String, required: true, select: false },
    papel: {
      type: String,
      enum: ['comprador', 'produtor', 'admin'],
      default: 'comprador',
    },
    produtor: { type: produtorSchema, default: undefined },
  },
  { timestamps: true },
);

// O que pode ser enviado ao cliente: nunca o hash da password
userSchema.methods.publico = function publico() {
  return {
    id: this._id,
    nome: this.nome,
    email: this.email,
    papel: this.papel,
    ...(this.produtor ? { produtor: this.produtor } : {}),
  };
};

export const User = model('User', userSchema);
