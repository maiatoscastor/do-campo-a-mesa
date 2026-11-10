// Contas para os indicadores dos inícios do produtor e do administrador: os últimos 30 dias
// comparados com os 30 anteriores, sempre a partir dos dados

export const DIA = 24 * 60 * 60 * 1000;

const PERCENTAGEM = new Intl.NumberFormat('pt-PT', {
  style: 'percent',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
});

// Divide as encomendas pelos dois períodos, pela data em que foram feitas, e soma cada um
export function encomendasPorPeriodo(encomendas, agora = new Date()) {
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

// "+25 % face aos 30 dias anteriores", com o sentido (para a cor; o sinal diz o mesmo por escrito)
export function comparacao(atual, anterior) {
  if (anterior === 0) {
    return atual === 0
      ? { texto: 'Igual aos 30 dias anteriores', sentido: 'igual' }
      : { texto: 'Nada nos 30 dias anteriores', sentido: 'sobe' };
  }
  const variacao = (atual - anterior) / anterior;
  if (Math.abs(variacao) < 0.005) {
    return { texto: 'Igual aos 30 dias anteriores', sentido: 'igual' };
  }
  return {
    texto: `${PERCENTAGEM.format(variacao)} face aos 30 dias anteriores`,
    sentido: variacao > 0 ? 'sobe' : 'desce',
  };
}
