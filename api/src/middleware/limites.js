import { rateLimit } from 'express-rate-limit';

const MINUTO = 60 * 1000;

// "1 minuto", "12 minutos"
function minutos(quantos) {
  return `${quantos} ${quantos === 1 ? 'minuto' : 'minutos'}`;
}

// Um limite de pedidos por endereço IP: depois de "maximo" pedidos numa janela de "janelaMs", os
// seguintes recebem 429 até a janela acabar, com a mensagem a dizer quanto tempo falta. "contar"
// diz que pedidos gastam tentativas: 'falhados' (só as respostas de erro, como uma password errada:
// quem acerta não é castigado), 'aceites' (só os que correram bem, como uma conta criada: quem se
// engana num campo não perde tentativas) ou 'todos'. Os contadores ficam na memória do servidor.
export function criarLimite({ janelaMs, maximo, contar = 'todos', mensagem }) {
  return rateLimit({
    windowMs: janelaMs,
    limit: maximo,
    skipSuccessfulRequests: contar === 'falhados',
    skipFailedRequests: contar === 'aceites',
    // Os cabeçalhos RateLimit e Retry-After da norma dizem ao cliente quantas tentativas restam e
    // quando pode voltar; os X-RateLimit antigos não são enviados
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // A resposta no formato dos outros erros da API ({ erro }), com o tempo que falta
    handler: (req, res) => {
      const falta = Math.max(
        1,
        Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / MINUTO),
      );
      res.status(429).json({ erro: mensagem(minutos(falta)) });
    },
  });
}

// Os testes automáticos criam muitas contas e sessões seguidas a partir do mesmo endereço, por isso
// desligam os limites (RATE_LIMIT=off no test/testes.env). Fora dos testes, ficam sempre ligados.
const desligados = process.env.RATE_LIMIT === 'off';
const semLimite = (req, res, next) => next();

// Entrar: 10 tentativas falhadas em 15 minutos, contra quem tenta adivinhar passwords
export const limiteDoLogin = desligados
  ? semLimite
  : criarLimite({
      janelaMs: 15 * MINUTO,
      maximo: 10,
      contar: 'falhados',
      mensagem: (falta) =>
        `Demasiadas tentativas falhadas. Tente de novo daqui a ${falta}.`,
    });

// Criar conta: 10 contas por hora, contra quem cria contas em massa
export const limiteDoRegisto = desligados
  ? semLimite
  : criarLimite({
      janelaMs: 60 * MINUTO,
      maximo: 10,
      contar: 'aceites',
      mensagem: (falta) =>
        `Foram criadas demasiadas contas a partir desta rede. Tente de novo daqui a ${falta}.`,
    });
