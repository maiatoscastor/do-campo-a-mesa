import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

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

// Avisa todos os administradores (por exemplo, de uma denúncia nova). Sem notificação, só envia o
// aviso técnico, para as listas e os contadores se atualizarem sem encher o sino de mensagens.
export async function avisarAdministradores(io, notificacao, evento, dados) {
  try {
    const administradores = await User.find({ papel: 'admin' }).select('_id');
    for (const { _id } of administradores) {
      if (notificacao) {
        await avisar(io, _id, notificacao, evento, dados);
      } else {
        io?.to(`user:${_id}`).emit(evento, dados);
      }
    }
  } catch (erro) {
    console.error(`Aviso aos administradores não enviado: ${erro.message}`);
  }
}

// O início do administrador mostra a aplicação em números (encomendas, utilizadores, leilões): este
// aviso, sem notificação, fá-lo voltar a ler os números quando alguma coisa muda
export function avisarPainel(io) {
  return avisarAdministradores(io, null, 'painel-mudou', {});
}
