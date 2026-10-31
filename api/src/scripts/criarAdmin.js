import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { ligarBaseDeDados } from '../config/db.js';
import { User } from '../models/User.js';
import { problemasDeUtilizador } from '../utils/erro.js';
import { cifrarPassword, problemaNaPassword } from '../utils/password.js';

// Cria uma conta de administrador: npm run criar-admin
// O registo público nunca cria administradores, por isso esta conta só se cria aqui, por quem tem
// acesso ao servidor. Os dados são pedidos no terminal para a password não ficar em nenhum ficheiro.

// Enquanto a password é escrita, o que passa por esta saída não aparece no ecrã
let esconder = false;
const saida = new Writable({
  write(pedaco, codificacao, feito) {
    if (!esconder) {
      process.stdout.write(pedaco, codificacao);
    }
    feito();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output: saida,
  terminal: Boolean(process.stdin.isTTY),
});

async function perguntarPassword(pergunta) {
  process.stdout.write(pergunta);
  esconder = true;
  const resposta = await terminal.question('');
  esconder = false;
  process.stdout.write('\n');
  return resposta;
}

async function criarAdmin() {
  await ligarBaseDeDados();

  const nome = await terminal.question('Nome: ');
  const email = await terminal.question('Email: ');
  const password = await perguntarPassword('Password: ');
  const repetida = await perguntarPassword('Repita a password: ');

  const problema = problemaNaPassword(password);
  if (problema) {
    throw new Error(problema);
  }
  if (password !== repetida) {
    throw new Error('As passwords não coincidem');
  }

  const admin = new User({ nome, email, papel: 'admin' });
  const problemas = Object.values(await problemasDeUtilizador(admin));
  if (problemas.length > 0) {
    throw new Error(problemas.join('; '));
  }

  admin.passwordHash = await cifrarPassword(password);
  await admin.save();
  console.log(`Administrador criado: ${admin.email}`);
}

try {
  await criarAdmin();
} catch (erro) {
  const mensagem =
    erro.code === 11000 ? 'Já existe uma conta com este email' : erro.message;
  // Só a mensagem: o objeto completo do erro pode trazer o endereço, que tem a password
  console.error(`Não foi possível criar o administrador: ${mensagem}`);
  process.exitCode = 1;
} finally {
  terminal.close();
  await mongoose.disconnect();
}
