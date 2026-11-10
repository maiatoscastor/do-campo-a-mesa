import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { avisar } from '../sockets/avisos.js';
import { criarErro } from '../utils/erro.js';

const router = Router();

// Todas as rotas deste ficheiro são só para administradores
router.use(auth('admin'));

// GET /api/admin/produtores/pendentes: os produtores à espera de validação, primeiro os mais antigos
router.get('/produtores/pendentes', async (req, res) => {
  const pendentes = await User.find({
    'produtor.validacao': 'pendente',
  }).sort({ createdAt: 1 });
  res.json(pendentes.map((produtor) => produtor.publico()));
});

// PATCH /api/admin/produtores/:id/validacao: aprova ou rejeita um produtor ({ "aprovado": true })
router.patch('/produtores/:id/validacao', async (req, res) => {
  const aprovado = req.body?.aprovado;
  if (typeof aprovado !== 'boolean') {
    throw criarErro(400, 'Indique se o produtor é aprovado (true ou false)');
  }

  const produtor = await User.findOneAndUpdate(
    { _id: req.params.id, papel: 'produtor' },
    { 'produtor.validacao': aprovado ? 'aprovado' : 'rejeitado' },
    { returnDocument: 'after' },
  );
  if (!produtor) {
    throw criarErro(404, 'Produtor não encontrado');
  }

  // O produtor fica logo a saber, sem ter de voltar a entrar
  await avisar(
    req.app.get('io'),
    produtor._id,
    {
      texto: aprovado
        ? 'A sua conta de produtor foi aprovada. Já pode publicar produtos e leilões.'
        : 'A sua conta de produtor não foi aprovada.',
      tipo: 'conta',
      ligacao: '/conta/quinta',
    },
    'conta-validada',
    { aprovado },
  );
  res.json(produtor.publico());
});

export default router;
