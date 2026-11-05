// Envia um aviso em tempo real a um utilizador, em todos os dispositivos dele que estejam ligados
// (a sala pessoal user:<id>). As rotas REST chegam ao Socket.io pela app (app.set('io') no
// server.js); sem Socket.io (por exemplo, em alguns testes), o aviso simplesmente não é enviado.
export function avisar(req, utilizadorId, evento, dados) {
  req.app.get('io')?.to(`user:${utilizadorId}`).emit(evento, dados);
}
