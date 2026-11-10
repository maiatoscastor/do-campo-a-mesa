import { Notification } from '../models/Notification.js';

// Avisa um utilizador: guarda a notificação, para a poder ver mais tarde mesmo que não esteja na
// aplicação, e envia-a já para os dispositivos dele que estejam ligados (a sala pessoal user:<id>).
// "evento" e "dados" são o aviso técnico que as páginas usam para se atualizarem sozinhas (por
// exemplo, a lista de encomendas). Sem Socket.io (em alguns testes), só fica guardada.
export async function avisar(
  io,
  utilizadorId,
  { texto, tipo, ligacao },
  evento,
  dados,
) {
  try {
    const notificacao = await Notification.create({
      utilizador: utilizadorId,
      texto,
      tipo,
      ligacao,
    });
    const sala = io?.to(`user:${utilizadorId}`);
    sala?.emit('notificacao', notificacao.publico());
    if (evento) {
      sala?.emit(evento, dados);
    }
  } catch (erro) {
    // O que aconteceu (a encomenda, o leilão) já está feito: um aviso que falha não o desfaz
    console.error(`Aviso não enviado: ${erro.message}`);
  }
}
