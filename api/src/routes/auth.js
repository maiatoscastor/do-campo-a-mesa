import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { criarErro, problemasDeUtilizador } from '../utils/erro.js';
import {
  cifrarPassword,
  passwordCerta,
  problemaNaPassword,
} from '../utils/password.js';

const router = Router();

function emitirToken(utilizador) {
  return jwt.sign(
    {
      id: utilizador._id.toString(),
      papel: utilizador.papel,
      nome: utilizador.nome,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '2h' },
  );
}

// Aceita só texto: impede que cheguem às consultas objetos como { "$gt": "" }
function texto(valor) {
  return typeof valor === 'string' ? valor : undefined;
}

// POST /api/auth/registo: cria uma conta de comprador ou de produtor e inicia a sessão.
// Só se leem os campos permitidos, em vez de copiar o req.body inteiro: de outra forma, alguém
// podia registar-se como administrador ou como produtor já aprovado.
router.post('/registo', async (req, res) => {
  const corpo = req.body ?? {};
  const password = texto(corpo.password);
  const papel = corpo.papel ?? 'comprador';

  if (papel !== 'comprador' && papel !== 'produtor') {
    throw criarErro(400, 'Tipo de conta inválido');
  }

  const utilizador = new User({
    nome: texto(corpo.nome),
    email: texto(corpo.email),
    papel,
    produtor:
      papel === 'produtor'
        ? {
            nomeExploracao: texto(corpo.nomeExploracao),
            localidade: texto(corpo.localidade),
            descricao: texto(corpo.descricao),
          }
        : undefined,
  });

  // Valida tudo de uma vez, para o formulário poder mostrar todos os problemas juntos
  const detalhes = await problemasDeUtilizador(utilizador);
  const problema = problemaNaPassword(password);
  if (problema) {
    detalhes.password = problema;
  }
  if (Object.keys(detalhes).length > 0) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), { detalhes });
  }

  utilizador.passwordHash = await cifrarPassword(password);

  try {
    await utilizador.save();
  } catch (erro) {
    if (erro.code === 11000) {
      throw Object.assign(criarErro(409, 'Este email já tem conta'), {
        detalhes: { email: 'Já existe uma conta com este email' },
      });
    }
    throw erro;
  }

  res.status(201).json({
    token: emitirToken(utilizador),
    utilizador: utilizador.publico(),
  });
});

// POST /api/auth/login: inicia a sessão
router.post('/login', async (req, res) => {
  const email = texto(req.body?.email)?.trim().toLowerCase();
  const password = texto(req.body?.password);

  const utilizador =
    email && (await User.findOne({ email }).select('+passwordHash'));
  const certa =
    utilizador &&
    password &&
    (await passwordCerta(password, utilizador.passwordHash));

  // A mesma resposta para email inexistente e password errada: não revela que emails têm conta
  if (!certa) {
    throw criarErro(401, 'Email ou password incorretos');
  }

  res.json({
    token: emitirToken(utilizador),
    utilizador: utilizador.publico(),
  });
});

// GET /api/auth/eu: devolve o utilizador da sessão, com os dados atuais (por exemplo, se o
// produtor já foi aprovado). Se a conta já não existir, a sessão deixa de ser válida.
router.get('/eu', auth(), async (req, res) => {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador) {
    throw criarErro(401, 'Sessão inválida ou expirada');
  }
  res.json(utilizador.publico());
});

export default router;
