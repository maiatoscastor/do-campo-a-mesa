// O que a aplicação precisa de saber sobre os produtos. A API valida as mesmas listas.
export const CATEGORIAS = [
  'Hortícolas',
  'Fruta',
  'Mel',
  'Vinho',
  'Queijo',
  'Padaria',
  'Outros',
];

export const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno'];

// Sem fotografia, o produto aparece com a ilustração da categoria
export const ILUSTRACAO_DA_CATEGORIA = {
  Hortícolas: 'couve',
  Fruta: 'maca',
  Mel: 'mel',
  Vinho: 'vinho',
  Queijo: 'queijo',
  Padaria: 'broa',
  Outros: 'cesto',
};

// "Hortícolas" passa a "horticolas": para nomes de classes CSS e para pesquisar sem acentos
export function semAcentos(texto) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const EUROS = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
});

// 8.5 passa a "8,50 €"
export function formatarPreco(preco) {
  return EUROS.format(preco);
}

// Com este stock ou menos, o produtor vê o aviso de stock baixo
export const STOCK_BAIXO = 5;
