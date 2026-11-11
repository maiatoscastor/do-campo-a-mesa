// Uma pesquisa de texto para o MongoDB ($regex): escapa os caracteres especiais, para procurar o
// texto tal como foi escrito (um "." ou um "(" não mudam o sentido da pesquisa), sem distinguir
// maiúsculas de minúsculas
export function expressao(texto) {
  return new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
