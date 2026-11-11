// Contas para os indicadores dos inícios do produtor e do administrador: os últimos 30 dias
// comparados com os 30 anteriores, sempre a partir dos dados

export const DIA = 24 * 60 * 60 * 1000;

const PERCENTAGEM = new Intl.NumberFormat('pt-PT', {
  style: 'percent',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
});

// Divide as encomendas pelos dois períodos, pela data em que foram feitas, e soma cada um. As
// canceladas não contam: não chegaram a ser vendas.
export function encomendasPorPeriodo(todas, agora = new Date()) {
  const encomendas = todas.filter(({ estado }) => estado !== 'cancelada');
  const ha30 = agora.getTime() - 30 * DIA;
  const ha60 = agora.getTime() - 60 * DIA;
  const somar = (lista) => ({
    quantas: lista.length,
    valor:
      Math.round(lista.reduce((soma, { total }) => soma + total, 0) * 100) /
      100,
  });
  const quando = ({ createdAt }) => new Date(createdAt).getTime();
  return {
    ultimos30: somar(encomendas.filter((e) => quando(e) >= ha30)),
    anteriores30: somar(
      encomendas.filter((e) => quando(e) >= ha60 && quando(e) < ha30),
    ),
  };
}

// "+25 % face aos 30 dias anteriores", com o sentido (para a cor; o sinal diz o mesmo por escrito).
// "periodo" é o período anterior por extenso (por omissão, os 30 dias das contas do início).
export function comparacao(atual, anterior, periodo = '30 dias anteriores') {
  if (anterior === 0) {
    return atual === 0
      ? { texto: `Igual aos ${periodo}`, sentido: 'igual' }
      : { texto: `Nada nos ${periodo}`, sentido: 'sobe' };
  }
  const variacao = (atual - anterior) / anterior;
  if (Math.abs(variacao) < 0.005) {
    return { texto: `Igual aos ${periodo}`, sentido: 'igual' };
  }
  return {
    texto: `${PERCENTAGEM.format(variacao)} face aos ${periodo}`,
    sentido: variacao > 0 ? 'sobe' : 'desce',
  };
}
