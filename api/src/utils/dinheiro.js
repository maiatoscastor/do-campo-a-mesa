// Valores em euros, com no máximo duas casas decimais.

// A comparação tem uma pequena margem, porque os números decimais não são exatos no computador
// (2,9 × 100 dá 289,99999999999997)
export function temAteDoisDecimais(valor) {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6;
}

// Arredonda aos cêntimos: 8,5 + 0,1 dá 8,6, e não 8,6000000000000001
export function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

const EUROS = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
});

// 225 passa a "225,00 €"
export function formatarEuros(valor) {
  return EUROS.format(valor);
}
