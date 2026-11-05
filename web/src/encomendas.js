// Os estados das encomendas, pela ordem em que acontecem. "acao" é o texto do botão com que o
// produtor passa a encomenda a esse estado.
export const ESTADOS = [
  { estado: 'pendente', nome: 'Pendente' },
  { estado: 'confirmada', nome: 'Confirmada', acao: 'Confirmar' },
  { estado: 'pronta', nome: 'Pronta', acao: 'Marcar como pronta' },
  { estado: 'entregue', nome: 'Entregue', acao: 'Marcar como entregue' },
];

// O estado a seguir a este, ou undefined se a encomenda já foi entregue
export function estadoSeguinte(estado) {
  return ESTADOS[ESTADOS.findIndex((e) => e.estado === estado) + 1];
}

const DATAS = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

const DATAS_CURTAS = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// "3 de novembro às 20:02"
export function formatarData(data) {
  return DATAS.format(new Date(data));
}

// "3/11, 20:02", para caber nos passos da encomenda
export function formatarDataCurta(data) {
  return DATAS_CURTAS.format(new Date(data));
}

// Soma em cêntimos, para não haver erros de arredondamento, e devolve em euros
export function somar(linhas) {
  const centimos = linhas.reduce(
    (soma, { preco, quantidade }) =>
      soma + Math.round(preco * 100) * quantidade,
    0,
  );
  return centimos / 100;
}
