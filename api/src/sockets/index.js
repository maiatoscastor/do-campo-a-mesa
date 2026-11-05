import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { registarLeiloes } from './leiloes.js';

// Liga o Socket.io ao servidor HTTP da API: o mesmo processo e a mesma porta. Quem tem sessão envia o
// token ao ligar, que é validado como nas rotas, e entra na sua sala pessoal (user:<id>), para receber
// avisos. Sem token, a ligação é aceite na mesma: um visitante pode assistir a um leilão, mas não
// pode licitar.
export function ligarSockets(servidorHttp) {
  const io = new Server(servidorHttp, {
    cors: { origin: process.env.CLIENT_URL },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    socket.data.utilizador = null;
    if (token) {
      try {
        socket.data.utilizador = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
      } catch {
        return next(new Error('Sessão inválida ou expirada'));
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const { utilizador } = socket.data;
    if (utilizador) {
      socket.join(`user:${utilizador.id}`);
    }
    registarLeiloes(io, socket);
  });

  return io;
}
