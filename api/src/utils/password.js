import bcrypt from 'bcryptjs';

// Custo 12 = 2¹² iterações: lento de propósito, para testar milhões de passwords ficar caro
const CUSTO_BCRYPT = 12;
const PASSWORD_MINIMO = 8;
// O bcrypt só usa os primeiros 72 bytes: o resto de uma password maior seria ignorado sem aviso
const PASSWORD_MAXIMO_BYTES = 72;

// Devolve a mensagem do problema, ou null se a password servir
export function problemaNaPassword(password) {
  if (!password || password.length < PASSWORD_MINIMO) {
    return `A password tem de ter pelo menos ${PASSWORD_MINIMO} caracteres`;
  }
  if (Buffer.byteLength(password) > PASSWORD_MAXIMO_BYTES) {
    return 'A password é demasiado comprida';
  }
  return null;
}

export function cifrarPassword(password) {
  return bcrypt.hash(password, CUSTO_BCRYPT);
}

export function passwordCerta(password, hash) {
  return bcrypt.compare(password, hash);
}
