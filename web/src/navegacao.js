// Destinos da navegação principal, partilhados pelo cabeçalho (computador) e pela barra inferior
// (telemóvel). Os caminhos são as páginas que a SPA vai ter no Passo 2.
export const DESTINOS = [
  { nome: 'Início', caminho: '/', icone: 'inicio' },
  { nome: 'Produtos', caminho: '/produtos', icone: 'produtos' },
  { nome: 'Leilões', caminho: '/leiloes', icone: 'leiloes' },
  { nome: 'Carrinho', caminho: '/carrinho', icone: 'carrinho' },
  { nome: 'Encomendas', caminho: '/encomendas', icone: 'encomendas' },
];

// Diz se um destino é a página aberta. Ainda não há routing no cliente (chega no Passo 2, com o
// React Router), por isso compara-se com o endereço do browser.
export function estaAtivo(caminho) {
  const atual = window.location.pathname;
  return caminho === '/' ? atual === '/' : atual.startsWith(caminho);
}
