import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';
import { contaBloqueada, User } from '../models/User.js';
import { avisarAdministradores, avisarPainel } from '../sockets/avisos.js';
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

// Grava o utilizador. O email é único: se já existir, responde 409 com a mensagem no campo certo.
// Só se validam os campos alterados, para uma conta antiga com dados em falta poder ser editada.
async function guardar(utilizador) {
  try {
    await utilizador.save({ validateModifiedOnly: true });
  } catch (erro) {
    if (erro.code === 11000) {
      throw Object.assign(criarErro(409, 'Este email já tem conta'), {
        detalhes: { email: 'Já existe uma conta com este email' },
      });
    }
    throw erro;
  }
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
            // Só os códigos: os nomes são preenchidos pelo modelo, a partir da lista oficial
            localizacao: {
              concelho: texto(corpo.concelho),
              freguesia: texto(corpo.freguesia),
            },
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

  await guardar(utilizador);

  // Um produtor novo fica à espera de validação: os administradores são avisados
  if (papel === 'produtor') {
    await avisarAdministradores(
      req.app.get('io'),
      {
        texto: `Novo produtor por validar: ${utilizador.produtor.nomeExploracao}.`,
        tipo: 'conta',
        ligacao: '/admin/produtores',
      },
      'produtores-mudaram',
      {},
    );
  }
  await avisarPainel(req.app.get('io'));

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
  // Só depois da password certa se diz que a conta está bloqueada
  if (contaBloqueada(utilizador)) {
    throw criarErro(403, 'A sua conta está bloqueada');
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
  // Uma conta bloqueada perde a sessão: com o 401, a aplicação termina-a (lê esta rota ao abrir e
  // quando o servidor avisa que a conta mudou)
  if (contaBloqueada(utilizador)) {
    throw criarErro(401, 'A sua conta está bloqueada');
  }
  res.json(utilizador.publico());
});

// PATCH /api/auth/eu: altera os dados pessoais de quem tem a sessão (só o nome e o email; o papel e o
// resto nunca vêm do pedido)
router.patch('/eu', auth(), async (req, res) => {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador) {
    throw criarErro(401, 'Sessão inválida ou expirada');
  }
  const corpo = req.body ?? {};
  for (const campo of ['nome', 'email']) {
    if (campo in corpo) {
      utilizador[campo] = texto(corpo[campo]);
    }
  }
  await guardar(utilizador);
  res.json(utilizador.publico());
});

export default router;
