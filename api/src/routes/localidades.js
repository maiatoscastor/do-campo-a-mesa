import { Router } from 'express';
import { concelhoPorCodigo, FONTE, REGIOES } from '../dados/territorio.js';
import { criarErro } from '../utils/erro.js';

const router = Router();

// Os dados só mudam quando sai uma nova CAOP: o browser pode guardar as respostas durante um dia
function guardarUmDia(req, res, next) {
  res.set('Cache-Control', 'public, max-age=86400');
  next();
}

// GET /api/localidades: os concelhos, agrupados por distrito ou região autónoma
router.get('/', guardarUmDia, (req, res) => {
  res.json({ ...FONTE, regioes: REGIOES });
});

// GET /api/localidades/:concelho/freguesias: as freguesias de um concelho, pelo código dele
router.get('/:concelho/freguesias', guardarUmDia, (req, res) => {
  const concelho = concelhoPorCodigo(req.params.concelho);
  if (!concelho) {
    throw criarErro(404, 'Concelho não encontrado');
  }
  res.json(concelho.freguesias);
});

export default router;
