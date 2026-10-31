import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js';
import admin from './routes/admin.js';
import auth from './routes/auth.js';

// Configura o Express sem o pôr a escutar: quem arranca o servidor é o server.js.
// Os middlewares correm pela ordem em que são registados.
const app = express();

// Não anunciar que o servidor usa Express
app.disable('x-powered-by');

// O browser só deixa outra origem chamar a API se esta o autorizar: autoriza-se só a aplicação web
app.use(cors({ origin: process.env.CLIENT_URL }));

// Converte o corpo JSON dos pedidos em req.body
app.use(express.json({ limit: '1mb' }));

// Diz se a API está a responder e se tem ligação à base de dados (readyState 1 quer dizer ligada)
app.get('/api/health', (req, res) => {
  const ligada = mongoose.connection.readyState === 1;
  res.status(ligada ? 200 : 503).json({
    estado: ligada ? 'ok' : 'com problemas',
    baseDeDados: ligada ? 'ligada' : 'desligada',
  });
});

app.use('/api/auth', auth);
app.use('/api/admin', admin);

// Estes dois ficam sempre em último: só chega aqui o que nenhuma rota tratou
app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
