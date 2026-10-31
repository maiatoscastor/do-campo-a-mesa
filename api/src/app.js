import express from 'express';

// Configura o Express sem o pôr a escutar: quem arranca o servidor é o server.js.
// Os middlewares correm pela ordem em que são registados.
const app = express();

// Não anunciar que o servidor usa Express
app.disable('x-powered-by');

// Converte o corpo JSON dos pedidos em req.body
app.use(express.json({ limit: '1mb' }));

// Permite confirmar que a API está a responder
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok' });
});

export default app;
