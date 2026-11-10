import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';

const router = Router();

// GET /api/notifications: as últimas 30 notificações de quem tem a sessão, das mais recentes para as
// mais antigas, e quantas estão por ler (o número no sino)
router.get('/', auth(), async (req, res) => {
  const [notificacoes, porLer] = await Promise.all([
    Notification.find({ utilizador: req.user.id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(30),
    Notification.countDocuments({ utilizador: req.user.id, lida: false }),
  ]);
  res.json({
    porLer,
    notificacoes: notificacoes.map((notificacao) => notificacao.publico()),
  });
});

// PATCH /api/notifications/lidas: marca todas como lidas, quando a lista é aberta. Responde 204.
router.patch('/lidas', auth(), async (req, res) => {
  await Notification.updateMany(
    { utilizador: req.user.id, lida: false },
    { lida: true },
  );
  res.status(204).end();
});

export default router;
