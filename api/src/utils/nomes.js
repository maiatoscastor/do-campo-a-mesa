// Como o nome aparece aos outros utilizadores, por exemplo no histórico de um leilão: "Ana Maria
// Teixeira" dá "Ana T.". Chega para se reconhecer quem licitou, sem mostrar o nome completo a todos.
export function nomeCurto(nome) {
  const palavras = nome.trim().split(/\s+/);
  return palavras.length > 1
    ? `${palavras[0]} ${palavras.at(-1)[0]}.`
    : palavras[0];
}
