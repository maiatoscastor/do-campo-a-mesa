import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, produtorAprovado } from '../middleware/auth.js';
import { Auction } from '../models/Auction.js';
import { Product } from '../models/Product.js';
import { criarErro, problemasDe } from '../utils/erro.js';

const router = Router();

// Os dados do produtor que acompanham cada leilão
export const CAMPOS_DO_PRODUTOR =
  'produtor.nomeExploracao produtor.localizacao';

// Duração entre 1 minuto e 7 dias; o início, no máximo daqui a 90 dias
const DURACAO_MAXIMA = 7 * 24 * 60;
const DIAS_DE_ANTECEDENCIA = 90;
const MINUTO = 60 * 1000;

// A hora de início pedida. Sem o campo, o leilão começa já; com o campo vazio ou inválido, a data
// fica inválida e o pedido é recusado com a mensagem certa.
function inicioDoPedido(valor) {
  if (valor === undefined) {
    return new Date();
  }
  return typeof valor === 'string' ? new Date(valor) : new Date(NaN);
}

// GET /api/auctions: a agenda, aberta a todos. Por omissão, os leilões a decorrer e os próximos, pela
// hora de início; com ?estado=terminado, os que já acabaram, dos mais recentes para os mais antigos.
router.get('/', async (req, res) => {
  const terminados = req.query.estado === 'terminado';
  const leiloes = await Auction.find(
    terminados
      ? { estado: 'terminado' }
      : { estado: { $in: ['agendado', 'ativo'] } },
  )
    .sort(terminados ? { terminaEm: -1 } : { iniciaEm: 1 })
    .limit(100)
    .populate('produtor', CAMPOS_DO_PRODUTOR);
  res.json(leiloes.map((leilao) => leilao.publico()));
});

// GET /api/auctions/meus: os leilões do produtor com sessão, dos mais recentes para os mais antigos
router.get('/meus', auth('produtor'), async (req, res) => {
  const leiloes = await Auction.find({ produtor: req.user.id }).sort({
    iniciaEm: -1,
  });
  res.json(leiloes.map((leilao) => leilao.publico()));
});

// GET /api/auctions/:id: um leilão
router.get('/:id', async (req, res) => {
  const leilao = await Auction.findById(req.params.id).populate(
    'produtor',
    CAMPOS_DO_PRODUTOR,
  );
  if (!leilao) {
    throw criarErro(404, 'Leilão não encontrado');
  }
  res.json(leilao.publico());
});

// POST /api/auctions: um produtor aprovado põe em leilão um lote de um dos seus produtos.
// Corpo: { produto, lote, descricao, precoBase, incremento, iniciaEm, duracao (em minutos) }.
// Responde 201, com o endereço do novo leilão no cabeçalho Location.
router.post('/', auth('produtor'), produtorAprovado, async (req, res) => {
  const corpo = req.body ?? {};
  const texto = (valor) => (typeof valor === 'string' ? valor : undefined);
  const numero = (valor) => (typeof valor === 'number' ? valor : undefined);

  // O produto tem de ser do próprio produtor
  const produto =
    typeof corpo.produto === 'string' &&
    mongoose.isObjectIdOrHexString(corpo.produto)
      ? await Product.findOne({ _id: corpo.produto, produtor: req.user.id })
      : null;
  const iniciaEm = inicioDoPedido(corpo.iniciaEm);
  const duracao = corpo.duracao;

  const leilao = new Auction({
    produtor: req.user.id,
    produto: produto?._id,
    nome: produto?.nome,
    categoria: produto?.categoria,
    imagemUrl: produto?.imagemUrl,
    lote: texto(corpo.lote),
    descricao: texto(corpo.descricao),
    precoBase: numero(corpo.precoBase),
    incremento: numero(corpo.incremento),
    iniciaEm,
    terminaEm: new Date(iniciaEm.getTime() + duracao * MINUTO),
  });

  // O produto, o início e a duração verificam-se aqui, com mensagens próprias; o resto, pelo modelo
  const detalhes = await problemasDe(leilao, [
    'produto',
    'nome',
    'categoria',
    'iniciaEm',
    'terminaEm',
  ]);
  if (!produto) {
    detalhes.produto = 'Escolha um dos seus produtos';
  }
  const agora = Date.now();
  if (Number.isNaN(iniciaEm.getTime())) {
    detalhes.iniciaEm = 'Indique a data e a hora de início';
  } else if (iniciaEm.getTime() < agora - MINUTO) {
    detalhes.iniciaEm = 'O início não pode ser no passado';
  } else if (
    iniciaEm.getTime() >
    agora + DIAS_DE_ANTECEDENCIA * 24 * 60 * MINUTO
  ) {
    detalhes.iniciaEm = `O início tem de ser nos próximos ${DIAS_DE_ANTECEDENCIA} dias`;
  }
  if (!Number.isInteger(duracao) || duracao < 1 || duracao > DURACAO_MAXIMA) {
    detalhes.duracao = 'Escolha uma duração entre 1 minuto e 7 dias';
  }
  if (Object.keys(detalhes).length > 0) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), { detalhes });
  }

  await leilao.save();
  res.status(201).location(`/api/auctions/${leilao.id}`).json(leilao.publico());
});

// DELETE /api/auctions/:id: o produtor cancela um leilão que ainda não começou. Responde 204.
router.delete('/:id', auth('produtor'), async (req, res) => {
  // Numa só operação: não se apaga um leilão que entretanto tenha começado
  const apagado = await Auction.findOneAndDelete({
    _id: req.params.id,
    produtor: req.user.id,
    iniciaEm: { $gt: new Date() },
  });
  if (!apagado) {
    const leilao = await Auction.findById(req.params.id);
    if (!leilao) {
      throw criarErro(404, 'Leilão não encontrado');
    }
    if (!leilao.produtor.equals(req.user.id)) {
      throw criarErro(403, 'Este leilão não é seu');
    }
    throw criarErro(409, 'Só se pode cancelar um leilão que ainda não começou');
  }
  res.status(204).end();
});

export default router;
