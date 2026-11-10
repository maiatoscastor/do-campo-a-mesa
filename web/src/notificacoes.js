import { formatarData } from './encomendas.js';

// O ícone de cada tipo de notificação (as antigas, sem tipo, ficam com o sino)
export const ICONES_DAS_NOTIFICACOES = {
  encomenda: 'encomendas',
  leilao: 'leiloes',
  conta: 'validar',
};

const RELATIVO = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' });

// "agora mesmo", "há 5 minutos", "há 3 horas"; a partir de um dia, a data ("5 de novembro às 20:40")
export function formatarHaQuanto(data, agora = Date.now()) {
  const minutos = Math.round((new Date(data).getTime() - agora) / 60000);
  if (minutos > -1) {
    return 'agora mesmo';
  }
  if (minutos > -60) {
    return RELATIVO.format(minutos, 'minute');
  }
  if (minutos > -24 * 60) {
    return RELATIVO.format(Math.round(minutos / 60), 'hour');
  }
  return formatarData(data);
}
