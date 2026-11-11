import { createServer } from 'node:http';
import app from './app.js';
import { ligarBaseDeDados } from './config/db.js';
import { iniciarCicloCastigos } from './services/castigos.js';
import { iniciarCicloLeiloes } from './services/cicloLeiloes.js';
import { ligarSockets } from './sockets/index.js';

// A porta vem do ambiente: na Cloud é a plataforma que a escolhe
const porta = process.env.PORT ?? 3000;

// Sem estas variáveis a API ficaria insegura, por isso nem chega a arrancar
for (const variavel of ['JWT_SECRET', 'CLIENT_URL']) {
  if (!process.env[variavel]) {
    console.error(`Falta a variável ${variavel} (ver .env.example)`);
    process.exit(1);
  }
}

// Só começa a aceitar pedidos depois de ligar à base de dados
try {
  await ligarBaseDeDados();
} catch (erro) {
  // Só a mensagem: o objeto completo do erro pode trazer o endereço, que tem a password
  console.error(`Não foi possível ligar à base de dados: ${erro.message}`);
  process.exit(1);
}

// A API e o Socket.io partilham o mesmo servidor HTTP (e a mesma porta)
const servidor = createServer(app);
const io = ligarSockets(servidor);
// As rotas também avisam quem está ligado (por exemplo, quando uma encomenda muda de estado)
app.set('io', io);
// Abre os leilões agendados e fecha os que acabaram; tira as suspensões que chegaram ao fim
iniciarCicloLeiloes(io);
iniciarCicloCastigos(io);

// Por exemplo, a porta já está ocupada
servidor.once('error', (erro) => {
  console.error(`Não foi possível usar a porta ${porta}: ${erro.message}`);
  process.exit(1);
});
servidor.listen(porta, () => {
  console.log(`API em http://localhost:${porta}`);
});
