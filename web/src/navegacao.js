// Destinos da navegação principal, partilhados pelo cabeçalho (computador) e pela barra inferior
// (telemóvel). "fechado" marca o que exige conta: o destino aparece na mesma, com um cadeado.
export const DESTINOS = [
  { nome: 'Início', caminho: '/', icone: 'inicio' },
  { nome: 'Produtos', caminho: '/produtos', icone: 'produtos' },
  { nome: 'Leilões', caminho: '/leiloes', icone: 'leiloes' },
  { nome: 'Carrinho', caminho: '/carrinho', icone: 'carrinho' },
  {
    nome: 'Encomendas',
    caminho: '/encomendas',
    icone: 'encomendas',
    fechado: true,
  },
];
