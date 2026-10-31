import mongoose from 'mongoose';

// Liga à base de dados indicada na variável de ambiente MONGODB_URI. Em caso de erro, desiste ao
// fim de 10 segundos (por omissão seriam 30).
export async function ligarBaseDeDados() {
  const endereco = process.env.MONGODB_URI;
  if (!endereco) {
    throw new Error('falta a variável MONGODB_URI (ver .env.example)');
  }

  // Sem o nome da base de dados no endereço, o MongoDB usaria uma chamada "test", sem avisar
  if (new URL(endereco).pathname.length <= 1) {
    throw new Error(
      'falta o nome da base de dados no fim do endereço (ver .env.example)',
    );
  }

  await mongoose.connect(endereco, { serverSelectionTimeoutMS: 10000 });
  console.log(`Ligado à base de dados "${mongoose.connection.name}"`);
}
