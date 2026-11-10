// A fase de um leilão neste momento, pela hora (já acertada com a do servidor). O estado guardado
// no servidor só muda de 2 em 2 segundos; a hora diz logo se já começou ou acabou. "a fechar" é o
// instante entre o fim do tempo e o servidor fechar o leilão.
export function faseDoLeilao(leilao, agora) {
  if (leilao.estado === 'terminado') {
    return 'terminado';
  }
  if (agora < new Date(leilao.iniciaEm).getTime()) {
    return 'agendado';
  }
  if (agora < new Date(leilao.terminaEm).getTime()) {
    return 'ativo';
  }
  return 'a fechar';
}

// Tempo restante: "04:59", ou "1:04:59" com horas, ou "2 d 3 h" com dias
export function formatarTempo(ms) {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  const dias = Math.floor(segundos / 86400);
  const horas = Math.floor((segundos % 86400) / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const dois = (n) => String(n).padStart(2, '0');
  if (dias > 0) {
    return `${dias} d ${horas} h`;
  }
  if (horas > 0) {
    return `${horas}:${dois(minutos)}:${dois(segundos % 60)}`;
  }
  return `${dois(minutos)}:${dois(segundos % 60)}`;
}

const HORAS = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
});

const DIAS = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// "20:30"
export function formatarHora(data) {
  return HORAS.format(new Date(data));
}

// "Hoje", "Amanhã" ou null, para os outros dias
function hojeOuAmanha(data) {
  const dia = new Date(data);
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  if (dia.toDateString() === hoje.toDateString()) {
    return 'Hoje';
  }
  if (dia.toDateString() === amanha.toDateString()) {
    return 'Amanhã';
  }
  return null;
}

// "Hoje", "Amanhã" ou "sexta-feira, 7 de novembro", para agrupar a agenda por dia
export function formatarDia(data) {
  return hojeOuAmanha(data) ?? DIAS.format(new Date(data));
}

const DIAS_CURTOS = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
});

// "Hoje", "Amanhã" ou "sexta, 7/11", onde há pouco espaço
export function formatarDiaCurto(data) {
  return hojeOuAmanha(data) ?? DIAS_CURTOS.format(new Date(data));
}

// As durações que o produtor pode escolher, em minutos
export const DURACOES = [
  { minutos: 2, nome: '2 minutos' },
  { minutos: 5, nome: '5 minutos' },
  { minutos: 10, nome: '10 minutos' },
  { minutos: 15, nome: '15 minutos' },
  { minutos: 30, nome: '30 minutos' },
  { minutos: 60, nome: '1 hora' },
  { minutos: 120, nome: '2 horas' },
  { minutos: 360, nome: '6 horas' },
  { minutos: 720, nome: '12 horas' },
  { minutos: 1440, nome: '1 dia' },
  { minutos: 4320, nome: '3 dias' },
  { minutos: 10080, nome: '7 dias' },
];

// Os atalhos da sala: somam à licitação atual, sem ficar abaixo do mínimo
export const ATALHOS = [5, 10, 25];
