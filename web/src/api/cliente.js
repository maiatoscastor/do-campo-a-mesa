const ENDERECO_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Erro de um pedido à API. Tem o código HTTP (0 se não houve resposta) e, nos dados inválidos, as
// mensagens de cada campo, para os formulários as mostrarem no sítio certo.
export class ErroApi extends Error {
  constructor(mensagem, estado, detalhes) {
    super(mensagem);
    this.estado = estado;
    this.detalhes = detalhes;
  }
}

// Todos os pedidos à API passam por aqui: junta o token, envia o corpo em JSON e transforma as
// respostas de erro em exceções, para quem chama só ter de tratar o caso de sucesso.
export async function api(caminho, { metodo = 'GET', corpo, token } = {}) {
  let resposta;
  try {
    resposta = await fetch(`${ENDERECO_API}/api${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    // O fetch só falha sozinho quando não chega a haver resposta (sem rede ou servidor em baixo)
    throw new ErroApi(
      'Não foi possível contactar o servidor. Tente novamente.',
      0,
    );
  }

  // Uma resposta sem corpo (204) ou que não seja JSON fica sem dados, em vez de rebentar aqui
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ErroApi(
      dados?.erro ?? 'Ocorreu um erro inesperado. Tente novamente.',
      resposta.status,
      dados?.detalhes,
    );
  }

  return dados;
}
