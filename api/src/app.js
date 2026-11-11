import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';
import { especificacao } from './config/especificacao.js';
import { rotaNaoEncontrada, tratarErros } from './middleware/erros.js';
import admin from './routes/admin.js';
import auctions from './routes/auctions.js';
import auth from './routes/auth.js';
import localidades from './routes/localidades.js';
import notifications from './routes/notifications.js';
import orders from './routes/orders.js';
import producers from './routes/producers.js';
import products from './routes/products.js';
import reviews from './routes/reviews.js';
import { PASTA_UPLOADS } from './utils/imagens.js';

// Configura o Express sem o pôr a escutar: quem arranca o servidor é o server.js.
// Os middlewares correm pela ordem em que são registados.
const app = express();

// Não anunciar que o servidor usa Express
app.disable('x-powered-by');

// Atrás de um proxy (por exemplo, na Cloud, onde outro servidor recebe os pedidos e os passa à API), o
// endereço de quem pede vem no cabeçalho X-Forwarded-For. TRUST_PROXY diz quantos proxies há à frente
// da API (0, sem nenhum, no computador). Os limites de tentativas contam por esse endereço.
const proxies = Number(process.env.TRUST_PROXY ?? 0);
if (!Number.isInteger(proxies) || proxies < 0) {
  throw new Error('TRUST_PROXY tem de ser o número de proxies (0 sem nenhum)');
}
app.set('trust proxy', proxies);

// Cabeçalhos de segurança (helmet). Por exemplo: o browser passa a usar sempre HTTPS para a API depois
// da primeira visita (HSTS), nenhum outro site a pode mostrar numa moldura, e a Content-Security-Policy
// limita de onde a página da documentação carrega scripts e estilos. Fica de fora o
// upgrade-insecure-requests, que manda o browser trocar os endereços HTTP da página por HTTPS: no
// computador a API só tem HTTP, e em produção o HSTS já obriga ao HTTPS.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
  }),
);

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
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacao));

app.use('/api/auth', auth);
app.use('/api/admin', admin);
app.use('/api/auctions', auctions);
app.use('/api/localidades', localidades);
app.use('/api/notifications', notifications);
app.use('/api/orders', orders);
app.use('/api/products', products);
app.use('/api/producers', producers);
app.use('/api/reviews', reviews);

// As fotografias dos produtos. Cada ficheiro tem um nome aleatório que nunca muda, por isso o browser
// pode guardá-lo sem voltar a perguntar. O helmet só deixa usar os ficheiros no mesmo site; as
// fotografias são a exceção, porque a aplicação web pode estar noutro endereço (na Cloud, está).
app.use(
  '/uploads',
  express.static(fileURLToPath(PASTA_UPLOADS), {
    immutable: true,
    maxAge: '365d',
    index: false,
    setHeaders: (res) =>
      res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  }),
);

// Estes dois ficam sempre em último: só chega aqui o que nenhuma rota tratou
app.use(rotaNaoEncontrada);
app.use(tratarErros);

export default app;
