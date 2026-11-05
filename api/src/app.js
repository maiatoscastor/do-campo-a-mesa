import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js';
import admin from './routes/admin.js';
import auctions from './routes/auctions.js';
import auth from './routes/auth.js';
import localidades from './routes/localidades.js';
import orders from './routes/orders.js';
import producers from './routes/producers.js';
import products from './routes/products.js';
import { PASTA_UPLOADS } from './utils/imagens.js';

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

// A documentação da API (OpenAPI), para ler e experimentar os pedidos no browser
const especificacao = parse(
  readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'),
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacao));

app.use('/api/auth', auth);
app.use('/api/admin', admin);
app.use('/api/auctions', auctions);
app.use('/api/localidades', localidades);
app.use('/api/orders', orders);
app.use('/api/products', products);
app.use('/api/producers', producers);

// As fotografias dos produtos. Cada ficheiro tem um nome aleatório que nunca muda, por isso o browser
// pode guardá-lo sem voltar a perguntar; o nosniff impede o browser de o tratar como outro tipo.
app.use(
  '/uploads',
  express.static(fileURLToPath(PASTA_UPLOADS), {
    immutable: true,
    maxAge: '365d',
    index: false,
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
  }),
);

// Estes dois ficam sempre em último: só chega aqui o que nenhuma rota tratou
app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
