// Ajudas para as avaliações (página do produtor, lista das avaliações e formulário).

// O que cada número de estrelas quer dizer, para quem avalia
export const SIGNIFICADO_DAS_ESTRELAS = {
  1: 'Mau',
  2: 'Fraco',
  3: 'Razoável',
  4: 'Bom',
  5: 'Excelente',
};

const UMA_CASA = new Intl.NumberFormat('pt-PT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Uma média tem sempre uma casa decimal: 4.7 dá "4,7" e 4 dá "4,0"
export function formatarMedia(media) {
  return UMA_CASA.format(media);
}

// Uma nota qualquer: as estrelas de uma avaliação ficam sem casas ("4"), uma média fica com uma
export function formatarNota(nota) {
  return Number.isInteger(nota) ? String(nota) : formatarMedia(nota);
}

// "1 avaliação", "23 avaliações"
export function textoDasAvaliacoes(total) {
  return total === 1 ? '1 avaliação' : `${total} avaliações`;
}

// "1 estrela", "4 estrelas"
export function textoDasEstrelas(estrelas) {
  return estrelas === 1 ? '1 estrela' : `${estrelas} estrelas`;
}

const DIA = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

// "5 de novembro de 2026"
export function formatarDia(data) {
  return DIA.format(new Date(data));
}
