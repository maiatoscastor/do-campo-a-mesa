import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Exige um token válido e, se forem indicados papéis, um desses papéis:
//   auth()             qualquer utilizador autenticado
//   auth('produtor')   só produtores
// Sem token ou com um token inválido responde 401 ("não sei quem és"); com um papel que não serve
// responde 403 ("sei quem és, mas não podes").
export function auth(...papeis) {
  return (req, res, next) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');

    try {
      if (tipo !== 'Bearer') {
        throw new Error('Falta o token');
      }
      // Só se aceita o algoritmo com que os tokens são assinados
      req.user = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
    } catch {
      return res.status(401).json({ erro: 'Sessão inválida ou expirada' });
    }

    if (papeis.length > 0 && !papeis.includes(req.user.papel)) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }

    next();
  };
}

// Só deixa passar produtores aprovados pelo administrador. Consulta a base de dados, porque a
// aprovação pode ter mudado depois de o token ser emitido. Usa-se a seguir ao auth('produtor').
export async function produtorAprovado(req, res, next) {
  const utilizador = await User.findById(req.user.id);
  if (utilizador?.produtor?.validacao !== 'aprovado') {
    return res
      .status(403)
      .json({ erro: 'A sua conta de produtor ainda não foi aprovada' });
  }
  next();
}
