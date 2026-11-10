// Os estados das encomendas, pela ordem em que acontecem. "acao" é o texto do botão com que o
// produtor passa a encomenda a esse estado.
export const ESTADOS = [
  { estado: 'pendente', nome: 'Pendente' },
  { estado: 'confirmada', nome: 'Confirmada', acao: 'Confirmar' },
  { estado: 'pronta', nome: 'Pronta', acao: 'Marcar como pronta' },
  { estado: 'entregue', nome: 'Entregue', acao: 'Marcar como entregue' },
];

// Os produtos que o comprador já encomendou e que continuam à venda e com stock, dos mais recentes
// para os mais antigos (as encomendas já vêm por essa ordem), sem repetidos
export function produtosParaComprarOutraVez(encomendas, produtos) {
  const vistos = new Set();
  const lista = [];
  for (const { linhas } of encomendas) {
    for (const { produto: id } of linhas) {
      const produto = produtos.find((p) => p.id === id);
      if (produto && produto.stock > 0 && !vistos.has(id)) {
        vistos.add(id);
        lista.push(produto);
      }
    }
  }
  return lista;
}

// O estado a seguir a este, ou undefined se a encomenda já foi entregue
export function estadoSeguinte(estado) {
  return ESTADOS[ESTADOS.findIndex((e) => e.estado === estado) + 1];
}

// As encomendas que o comprador ainda acompanha no início: primeiro as que estão em curso, depois
// as entregues que ainda não avaliou
export function encomendasPorAcompanhar(encomendas) {
  return [
    ...encomendas.filter(({ estado }) => estado !== 'entregue'),
    ...encomendas.filter(
      ({ estado, avaliacao }) => estado === 'entregue' && !avaliacao,
    ),
  ];
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
