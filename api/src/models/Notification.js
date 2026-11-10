import { model, Schema } from 'mongoose';

// Uma notificação de um utilizador (encomenda nova, mudança de estado, leilão ganho…). Fica guardada
// para se ver mais tarde, mesmo que a pessoa não estivesse na aplicação quando aconteceu.
const notificationSchema = new Schema(
  {
    utilizador: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    texto: { type: String, required: true },
    // Para a aplicação mostrar o ícone certo
    tipo: { type: String, enum: ['encomenda', 'leilao', 'conta'] },
    // A página da aplicação a que a notificação se refere (por exemplo, /encomendas)
    ligacao: String,
    lida: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// As mais recentes de cada utilizador
notificationSchema.index({ utilizador: 1, createdAt: -1 });
// O MongoDB apaga-as sozinho ao fim de 90 dias, para a coleção não crescer sem fim
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

// O que se envia ao cliente
notificationSchema.methods.publico = function publico() {
  return {
    id: this._id,
    texto: this.texto,
    tipo: this.tipo,
    ligacao: this.ligacao,
    lida: this.lida,
    data: this.createdAt,
  };
};

export const Notification = model('Notification', notificationSchema);
