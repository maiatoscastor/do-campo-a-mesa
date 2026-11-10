// Os motivos de uma denúncia, pela ordem do formulário (os mesmos valores da API). Uma avaliação
// negativa e honesta não está aqui: denuncia-se o que não devia estar publicado.
// "frase" é o motivo como o administrador o sugere ao ocultar (pode mudá-lo antes de confirmar).
export const MOTIVOS_DE_DENUNCIA = [
  {
    valor: 'ofensiva',
    nome: 'Linguagem ofensiva ou discriminatória',
    frase: 'Tem linguagem ofensiva ou discriminatória.',
  },
  {
    valor: 'dados-pessoais',
    nome: 'Tem dados pessoais (telefone, morada…)',
    frase: 'Tem dados pessoais.',
  },
  {
    valor: 'falsa',
    nome: 'Falsa ou enganadora',
    frase: 'É falsa ou enganadora.',
  },
  {
    valor: 'publicidade',
    nome: 'Publicidade ou spam',
    frase: 'É publicidade ou spam.',
  },
  { valor: 'outro', nome: 'Outro motivo', frase: '' },
];

function motivo(valor) {
  return MOTIVOS_DE_DENUNCIA.find((m) => m.valor === valor);
}

export function nomeDoMotivo(valor) {
  return motivo(valor)?.nome;
}

export function fraseDoMotivo(valor) {
  return motivo(valor)?.frase ?? '';
}

// "1 denúncia", "3 denúncias"
export function textoDasDenuncias(total) {
  return total === 1 ? '1 denúncia' : `${total} denúncias`;
}
