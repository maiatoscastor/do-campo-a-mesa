// O endereço da API só é preciso na publicação. Em desenvolvimento fica vazio: os pedidos vão para o
// próprio site, e o Vite passa-os à API (ver vite.config.js).
export const ENDERECO_API = import.meta.env.VITE_API_URL ?? '';

const SEM_LIGACAO = 'Não foi possível contactar o servidor. Tente novamente.';

// Erro de um pedido à API. Tem o código HTTP (0 se não houve resposta) e, nos dados inválidos, as
// mensagens de cada campo, para os formulários as mostrarem no sítio certo.
export class ErroApi extends Error {
  constructor(mensagem, estado, detalhes) {
    super(mensagem);
    this.estado = estado;
    this.detalhes = detalhes;
  }
}

// As fotografias vêm da API com um endereço relativo (/uploads/…)
export function enderecoDaImagem(endereco) {
  return endereco ? `${ENDERECO_API}${endereco}` : undefined;
}

// Todos os pedidos à API passam por aqui: junta o token, envia o corpo em JSON e transforma as
// respostas de erro em exceções, para quem chama só ter de tratar o caso de sucesso. Um FormData
// (por exemplo, com uma fotografia) segue tal como está, e o browser escolhe o Content-Type.
export async function api(caminho, { metodo = 'GET', corpo, token } = {}) {
  const emJson = corpo !== undefined && !(corpo instanceof FormData);
  let resposta;
  try {
    resposta = await fetch(`${ENDERECO_API}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(emJson ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: emJson ? JSON.stringify(corpo) : corpo,
    });
  } catch {
    // O fetch só falha sozinho quando não chega a haver resposta (sem rede ou servidor em baixo)
    throw new ErroApi(SEM_LIGACAO, 0);
  }

  // Uma resposta sem corpo (204) ou que não seja JSON fica sem dados, em vez de rebentar aqui
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // Os erros da API vêm sempre em JSON. Sem ele, quem respondeu foi um intermediário (como o Vite),
    // porque a API não está a responder.
    throw new ErroApi(
      dados?.erro ?? SEM_LIGACAO,
      resposta.status,
      dados?.detalhes,
    );
  }

  return dados;
}
