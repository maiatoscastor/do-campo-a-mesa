// Destinos da navegação principal, partilhados pelo cabeçalho (computador) e pela barra inferior
// (telemóvel). "fechado" marca o que exige conta: o destino aparece na mesma, com um cadeado.
// "esconderPara" lista os papéis que não precisam do destino (o administrador não compra).
export const DESTINOS = [
  { nome: 'Início', caminho: '/', icone: 'inicio' },
  { nome: 'Produtos', caminho: '/produtos', icone: 'produtos' },
  { nome: 'Leilões', caminho: '/leiloes', icone: 'leiloes' },
  {
    nome: 'Carrinho',
    caminho: '/carrinho',
    icone: 'carrinho',
    esconderPara: ['admin'],
  },
  {
    nome: 'Encomendas',
    caminho: '/encomendas',
    icone: 'encomendas',
    fechado: true,
  },
];

// Os destinos de quem está a usar a aplicação (sem sessão, todos)
export function destinosPara(utilizador) {
  return DESTINOS.filter(
    ({ esconderPara }) => !esconderPara?.includes(utilizador?.papel),
  );
}

// O que se acrescenta ao nome "Carrinho" para os leitores de ecrã: ", 2 produtos"
export function textoDoCarrinho(produtos) {
  if (produtos === 0) {
    return '';
  }
  return `, ${produtos} ${produtos === 1 ? 'produto' : 'produtos'}`;
}
