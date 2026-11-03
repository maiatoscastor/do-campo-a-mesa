import { model, Schema } from 'mongoose';
import { concelhoPorCodigo, freguesiaPorCodigo } from '../dados/territorio.js';

// Onde fica a quinta ou o negócio, em qualquer concelho do país. Guardam-se os códigos oficiais
// (CAOP), porque há nomes repetidos (há um concelho Lagoa no Algarve e outro nos Açores), e também os
// nomes, para se poderem mostrar sem voltar à lista.
const localizacaoSchema = new Schema(
  {
    concelho: {
      type: String,
      required: [true, 'Escolha o concelho'],
      validate: {
        validator: (codigo) => Boolean(concelhoPorCodigo(codigo)),
        message: 'Escolha o concelho',
      },
    },
    freguesia: {
      type: String,
      required: [true, 'Escolha a freguesia'],
      // A freguesia tem de existir e de pertencer ao concelho escolhido
      validate: {
        validator(codigo) {
          const freguesia = freguesiaPorCodigo(codigo);
          return Boolean(freguesia) && freguesia.concelho === this.concelho;
        },
        message: 'Escolha a freguesia',
      },
    },
    nomeConcelho: String,
    nomeFreguesia: String,
    regiao: String,
  },
  { _id: false },
);

// Os nomes vêm sempre da lista oficial, a partir dos códigos: quem faz o pedido só envia os códigos
localizacaoSchema.pre('validate', function preencherNomes() {
  const concelho = concelhoPorCodigo(this.concelho);
  const freguesia = freguesiaPorCodigo(this.freguesia);
  this.nomeConcelho = concelho?.nome;
  this.regiao = concelho?.regiao;
  this.nomeFreguesia =
    freguesia && freguesia.concelho === this.concelho
      ? freguesia.nome
      : undefined;
});

// Dados que só os produtores têm. É um subdocumento (embebido), porque pertencem ao utilizador e
// são sempre lidos com ele; e o _id é desligado, porque nunca se procura um destes sozinho.
const produtorSchema = new Schema(
  {
    nomeExploracao: {
      type: String,
      required: [true, 'Indique o nome da quinta ou do negócio'],
      trim: true,
      maxlength: [100, 'O nome é demasiado comprido'],
    },
    localizacao: { type: localizacaoSchema, required: true },
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
    // Contas inventadas para testar (produtores de exemplo), identificadas como tal na aplicação
    exemplo: { type: Boolean, default: false },
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
