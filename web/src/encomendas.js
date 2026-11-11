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

// O estado a seguir a este, ou undefined se a encomenda já foi entregue ou foi cancelada
export function estadoSeguinte(estado) {
  const atual = ESTADOS.findIndex((e) => e.estado === estado);
  return atual === -1 ? undefined : ESTADOS[atual + 1];
}

// O nome de um estado, também do "cancelada", que fica fora dos passos (só acontece quando o
// produtor é banido)
export function nomeDoEstado(estado) {
  if (estado === 'cancelada') {
    return 'Cancelada';
  }
  return ESTADOS.find((e) => e.estado === estado)?.nome ?? estado;
}

// Se a encomenda ainda está por entregar (nem entregue, nem cancelada)
export function porEntregar({ estado }) {
  return estado !== 'entregue' && estado !== 'cancelada';
}

// As encomendas que o comprador ainda acompanha no início: primeiro as que estão em curso, depois
// as entregues que ainda não avaliou
export function encomendasPorAcompanhar(encomendas) {
  return [
    ...encomendas.filter(porEntregar),
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

// O que falta fazer às encomendas em curso, a partir de quantas há em cada estado:
// "1 por confirmar · 2 a preparar · 1 pronta a entregar" (só os estados com alguma)
const POR_FAZER = {
  pendente: ['por confirmar', 'por confirmar'],
  confirmada: ['a preparar', 'a preparar'],
  pronta: ['pronta a entregar', 'prontas a entregar'],
};

export function textoPorFazer(porEstado) {
  const partes = Object.entries(POR_FAZER)
    .map(([estado, [uma, varias]]) => {
      const quantas = porEstado[estado] ?? 0;
      // O número e as palavras ficam juntos na mesma linha (espaços que não partem)
      const texto = (quantas === 1 ? uma : varias).replaceAll(' ', '\u00a0');
      return quantas > 0 && `${quantas}\u00a0${texto}`;
    })
    .filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Nada por tratar';
}
