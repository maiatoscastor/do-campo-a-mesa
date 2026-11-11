// Datas escritas por extenso, para os textos das notificações. A hora é sempre a de Portugal
// continental, mesmo que o servidor esteja noutro fuso horário (na cloud, costuma estar em UTC).
const DATA_E_HORA = new Intl.DateTimeFormat('pt-PT', {
  timeZone: 'Europe/Lisbon',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

// "quinta-feira, 12 de novembro às 21:00"
export function formatarDataHora(data) {
  return DATA_E_HORA.format(data);
}
