// Ajudas para a página pública de um produtor (PaginaProdutor.jsx e MinhaPagina.jsx).

const NOMES_DOS_DIAS = [
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
];

// Os dias da semana para escolher, de 1 (segunda) a 7 (domingo)
export const DIAS_DA_SEMANA = NOMES_DOS_DIAS.map((nome, indice) => ({
  dia: indice + 1,
  nome,
  curto: nome.slice(0, 3),
}));

// O dia da semana de uma data, de 1 (segunda) a 7 (domingo). O getDay() conta de 0 (domingo) a
// 6 (sábado), por isso o 0 passa a 7.
export function diaDaSemana(data = new Date()) {
  return data.getDay() || 7;
}

// A semana toda, de segunda a domingo, com o horário de cada dia (null nos dias em que não há
// levantamento) e o dia de hoje assinalado
export function semanaDoLevantamento(
  { dias, abre, fecha },
  hoje = diaDaSemana(),
) {
  return DIAS_DA_SEMANA.map(({ dia, nome }) => ({
    dia,
    nome: nome.charAt(0).toUpperCase() + nome.slice(1),
    horas: dias.includes(dia) ? `${abre}–${fecha}` : null,
    hoje: dia === hoje,
  }));
}

// No iPhone e no iPad, a ligação abre a app Mapas da Apple; nos outros (Android e computador), o
// Google Maps. Os iPad recentes apresentam-se como Mac, mas têm ecrã tátil.
function eDispositivoApple() {
  const { userAgent, maxTouchPoints } = navigator;
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  );
}

// O endereço que abre o ponto da quinta na aplicação de mapas, com o pino no sítio escolhido
export function enderecoNoMaps({ lat, lng }, nome) {
  if (eDispositivoApple()) {
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(nome)}`;
  }
  const parametros = new URLSearchParams({ api: '1', query: `${lat},${lng}` });
  return `https://www.google.com/maps/search/?${parametros}`;
}

// As ligações dos contactos que o produtor quis mostrar, prontas a tocar
export function ligacoesDosContactos(contactos = {}) {
  const { telefone, site, instagram, facebook } = contactos;
  return [
    telefone && {
      icone: 'telefone',
      texto: telefone,
      endereco: `tel:${telefone.replaceAll(' ', '')}`,
    },
    site && {
      icone: 'site',
      texto: site.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''),
      endereco: site,
    },
    instagram && {
      icone: 'site',
      texto: `Instagram @${instagram}`,
      endereco: `https://www.instagram.com/${instagram}`,
    },
    facebook && { icone: 'site', texto: 'Facebook', endereco: facebook },
  ].filter(Boolean);
}

const MES_E_ANO = new Intl.DateTimeFormat('pt-PT', {
  month: 'long',
  year: 'numeric',
});

// "novembro de 2026"
export function formatarMesEAno(data) {
  return MES_E_ANO.format(new Date(data));
}
