import { Router } from 'express';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';

const router = Router();

// GET /api/producers: os produtores aprovados, abertos a todos. Com ?comProdutos=true, só os que
// têm produtos: é o que usam os filtros do catálogo, para nenhum filtro dar zero resultados.
router.get('/', async (req, res) => {
  const filtro = { papel: 'produtor', 'produtor.validacao': 'aprovado' };
  if (req.query.comProdutos === 'true') {
    filtro._id = { $in: await Product.distinct('produtor') };
  }
  const produtores = await User.find(filtro)
    .select('produtor.nomeExploracao produtor.localizacao exemplo')
    .sort({ 'produtor.nomeExploracao': 1 });

  res.json(
    produtores.map(({ id, produtor, exemplo }) => ({
      id,
      nomeExploracao: produtor.nomeExploracao,
      localizacao: produtor.localizacao,
      exemplo,
    })),
  );
});

export default router;
