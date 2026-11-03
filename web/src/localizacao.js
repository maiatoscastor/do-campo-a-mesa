// A localização de uma quinta ou negócio em texto: "Arcozelo, Ponte de Lima"
export function textoDaLocalizacao(localizacao) {
  if (!localizacao) {
    return '';
  }
  return [localizacao.nomeFreguesia, localizacao.nomeConcelho]
    .filter(Boolean)
    .join(', ');
}
