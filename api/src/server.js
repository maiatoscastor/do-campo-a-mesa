import app from './app.js';
import { ligarBaseDeDados } from './config/db.js';

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

// No Express 5, o callback também recebe o erro se não conseguir escutar (por exemplo, porta ocupada)
app.listen(porta, (erro) => {
  if (erro) {
    console.error(`Não foi possível usar a porta ${porta}: ${erro.message}`);
    process.exit(1);
  }
  console.log(`API em http://localhost:${porta}`);
});
