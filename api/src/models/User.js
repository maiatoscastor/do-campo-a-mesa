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

// Horas no formato 24 h ("09:00")
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Quando se pode levantar na quinta: os dias da semana (1 = segunda … 7 = domingo) e um horário
const levantamentoSchema = new Schema(
  {
    dias: {
      type: [Number],
      validate: {
        validator: (dias) =>
          dias.length > 0 &&
          new Set(dias).size === dias.length &&
          dias.every((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 7),
        message: 'Escolha pelo menos um dia',
      },
    },
    abre: {
      type: String,
      required: [true, 'Indique a hora de abertura'],
      match: [HORA, 'Indique a hora de abertura'],
    },
    fecha: {
      type: String,
      required: [true, 'Indique a hora de fecho'],
      match: [HORA, 'Indique a hora de fecho'],
      validate: {
        validator(fecha) {
          return !this.abre || fecha > this.abre;
        },
        message: 'A hora de fecho tem de ser depois da de abertura',
      },
    },
    nota: {
      type: String,
      trim: true,
      maxlength: [200, 'A nota é demasiado comprida'],
    },
  },
  { _id: false },
);

// Contactos que o produtor quer mostrar na sua página, todos opcionais
const contactosSchema = new Schema(
  {
    telefone: {
      type: String,
      trim: true,
      match: [/^\+?[\d ]{9,16}$/, 'O telefone não é válido'],
    },
    site: {
      type: String,
      trim: true,
      maxlength: [200, 'O endereço é demasiado comprido'],
      match: [
        /^https?:\/\/[^\s/]+\.[^\s]+$/i,
        'Escreva o endereço completo, a começar por https://',
      ],
    },
    // Só o nome de utilizador (sem @)
    instagram: {
      type: String,
      trim: true,
      match: [/^[\w.]{1,30}$/, 'Escreva só o nome de utilizador do Instagram'],
    },
    facebook: {
      type: String,
      trim: true,
      maxlength: [200, 'O endereço é demasiado comprido'],
      match: [
        /^https?:\/\/(www\.|m\.)?(facebook|fb)\.com\/\S+$/i,
        'Escreva o endereço da página de Facebook',
      ],
    },
  },
  { _id: false },
);

// O ponto da quinta no mapa. Os limites apanham o continente, os Açores e a Madeira.
const pontoSchema = new Schema(
  {
    lat: {
      type: Number,
      required: [true, 'Marque o ponto no mapa'],
      min: [29.5, 'O ponto tem de ser em Portugal'],
      max: [42.3, 'O ponto tem de ser em Portugal'],
    },
    lng: {
      type: Number,
      required: [true, 'Marque o ponto no mapa'],
      min: [-31.6, 'O ponto tem de ser em Portugal'],
      max: [-6.1, 'O ponto tem de ser em Portugal'],
    },
  },
  { _id: false },
);

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
    // A história da quinta, que aparece na página pública
    descricao: {
      type: String,
      trim: true,
      maxlength: [2000, 'O texto é demasiado comprido'],
    },
    // A página pública: capa, logótipo, levantamento, contactos e ponto no mapa (tudo opcional)
    capaUrl: String,
    logotipoUrl: String,
    levantamento: { type: levantamentoSchema, default: undefined },
    contactos: { type: contactosSchema, default: undefined },
    ponto: { type: pontoSchema, default: undefined },
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
