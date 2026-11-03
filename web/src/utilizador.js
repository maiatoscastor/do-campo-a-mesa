// Nomes dos papéis, como aparecem na aplicação
export const PAPEIS = {
  comprador: 'Comprador',
  produtor: 'Produtor',
  admin: 'Administrador',
};

// As iniciais do primeiro e do último nome ("Ana Maria Costa" dá "AC")
export function iniciais(nome) {
  const palavras = nome.trim().split(/\s+/);
  const letras = [palavras[0], palavras.at(-1)].slice(0, palavras.length);
  return letras.map(([letra]) => letra.toUpperCase()).join('');
}
