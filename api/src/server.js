import app from './app.js';

// A porta vem do ambiente: na Cloud é a plataforma que a escolhe
const porta = process.env.PORT ?? 3000;

// No Express 5, o callback também recebe o erro se não conseguir escutar (por exemplo, porta ocupada)
app.listen(porta, (erro) => {
  if (erro) {
    console.error(`Não foi possível usar a porta ${porta}: ${erro.message}`);
    process.exit(1);
  }
  console.log(`API em http://localhost:${porta}`);
});
