import { Router } from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import { avisar } from '../sockets/avisos.js';
import { ESTADOS, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { formatarEuros } from '../utils/dinheiro.js';
import { criarErro } from '../utils/erro.js';

const router = Router();

const MAXIMO_DE_PRODUTOS = 50;
const MAXIMO_POR_PRODUTO = 1000;

// O que o produtor fez à encomenda, como o comprador o lê na notificação
const MUDANCAS = {
  confirmada: 'confirmou a sua encomenda',
  pronta: 'tem a sua encomenda pronta',
  entregue: 'marcou a sua encomenda como entregue. Já a pode avaliar',
};

// O que se envia ao cliente. O comprador e o produtor, quando foram carregados (populate), vêm só
// com os dados que interessam a quem vê a encomenda. A avaliação, quando existe, vem resumida.
function encomendaPublica(encomenda, avaliacao) {
  const { _id, comprador, produtor, ...resto } = encomenda.toObject({
    versionKey: false,
  });
  return {
    id: _id,
    ...resto,
    comprador: comprador?.nome
      ? { id: comprador._id, nome: comprador.nome, email: comprador.email }
      : comprador,
    produtor: produtor?.produtor
      ? {
          id: produtor._id,
          nomeExploracao: produtor.produtor.nomeExploracao,
          localizacao: produtor.produtor.localizacao,
        }
      : produtor,
    avaliacao,
  };
}

// As encomendas prontas a enviar, cada uma com a sua avaliação (o identificador, as estrelas e se
// está visível): o comprador vê se já a avaliou, e o produtor vê a nota que recebeu
async function comAvaliacoes(encomendas) {
  const avaliacoes = await Review.find({
    encomenda: { $in: encomendas.map(({ _id }) => _id) },
  }).select('encomenda classificacao visivel');
  return encomendas.map((encomenda) => {
    const avaliacao = avaliacoes.find((a) => a.encomenda.equals(encomenda._id));
    return encomendaPublica(
      encomenda,
      avaliacao && {
        id: avaliacao.id,
        classificacao: avaliacao.classificacao,
        visivel: avaliacao.visivel,
      },
    );
  });
}

// As linhas do pedido, [{ produto, quantidade }], num Map de produto para quantidade. O mesmo
// produto em duas linhas junta-se numa só. O preço nunca vem do pedido: lê-se do produto.
function quantidadesDoPedido(linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    throw criarErro(400, 'O carrinho está vazio');
  }
  if (linhas.length > MAXIMO_DE_PRODUTOS) {
    throw criarErro(
      400,
      `Uma encomenda pode ter no máximo ${MAXIMO_DE_PRODUTOS} produtos`,
    );
  }
  const quantidades = new Map();
  for (const linha of linhas) {
    const { produto, quantidade } = linha ?? {};
    const valida =
      typeof produto === 'string' &&
      mongoose.isObjectIdOrHexString(produto) &&
      Number.isInteger(quantidade) &&
      quantidade >= 1 &&
      quantidade <= MAXIMO_POR_PRODUTO;
    if (!valida) {
      throw criarErro(400, 'Produto ou quantidade inválidos');
    }
    quantidades.set(produto, (quantidades.get(produto) ?? 0) + quantidade);
  }
  return quantidades;
}

// Em cêntimos, para a soma ser exata (0,1 + 0,2 não dá 0,3 em números decimais), e de volta a euros
function totalDe(linhas) {
  const centimos = linhas.reduce(
    (soma, { preco, quantidade }) =>
      soma + Math.round(preco * 100) * quantidade,
    0,
  );
  return centimos / 100;
}

// GET /api/orders: as encomendas que quem tem a sessão fez, das mais recentes para as mais antigas
router.get('/', auth(), async (req, res) => {
  const encomendas = await Order.find({ comprador: req.user.id })
    .sort({ createdAt: -1 })
    .populate('produtor', 'produtor.nomeExploracao produtor.localizacao');
  res.json(await comAvaliacoes(encomendas));
});

// GET /api/orders/recebidas: as encomendas feitas ao produtor com sessão
router.get('/recebidas', auth('produtor'), async (req, res) => {
  const encomendas = await Order.find({ produtor: req.user.id })
    .sort({ createdAt: -1 })
    .populate('comprador', 'nome email');
  res.json(await comAvaliacoes(encomendas));
});

// GET /api/orders/:id: uma encomenda, para quem a fez ou para o produtor a quem foi feita (por
// exemplo, para a avaliar). Fica depois de /recebidas, senão "recebidas" seria lido como um id.
router.get('/:id', auth(), async (req, res) => {
  const encomenda = await Order.findById(req.params.id)
    .populate('produtor', 'produtor.nomeExploracao produtor.localizacao')
    .populate('comprador', 'nome email');
  if (!encomenda) {
    throw criarErro(404, 'Encomenda não encontrada');
  }
  const envolvido =
    encomenda.comprador._id.equals(req.user.id) ||
    encomenda.produtor._id.equals(req.user.id);
  if (!envolvido) {
    throw criarErro(403, 'Esta encomenda não é sua');
  }
  const [publica] = await comAvaliacoes([encomenda]);
  res.json(publica);
});

// POST /api/orders: encomenda o carrinho. Corpo: { linhas: [{ produto, quantidade }], modo, morada }.
// Cria uma encomenda por produtor e responde 201 com a lista delas.
router.post('/', auth('comprador', 'produtor'), async (req, res) => {
  const corpo = req.body ?? {};
  const quantidades = quantidadesDoPedido(corpo.linhas);
  const entrega = {
    modo: typeof corpo.modo === 'string' ? corpo.modo : undefined,
    morada:
      corpo.modo === 'entrega' && typeof corpo.morada === 'string'
        ? corpo.morada
        : undefined,
  };
  // O modo e a morada validam-se antes de mexer no stock
  await new Order(entrega).validate(['modo', 'morada']);

  // Só se encomendam produtos de produtores aprovados, e nunca os do próprio
  const produtos = await Product.find({
    _id: { $in: [...quantidades.keys()] },
  });
  const aprovados = await User.find({
    _id: { $in: produtos.map(({ produtor }) => produtor) },
    'produtor.validacao': 'aprovado',
  }).distinct('_id');
  for (const id of quantidades.keys()) {
    const produto = produtos.find((p) => p.id === id);
    if (!produto || !aprovados.some((a) => a.equals(produto.produtor))) {
      throw criarErro(409, 'Um dos produtos já não está à venda');
    }
    if (produto.produtor.equals(req.user.id)) {
      throw criarErro(400, 'Não pode encomendar os seus próprios produtos');
    }
  }

  // Tudo ou nada: o stock de todos os produtos desce numa transação, e se faltar stock de um, a
  // transação é anulada e nenhum stock muda. O filtro "stock ≥ quantidade" e a descida ($inc) são
  // uma só operação atómica, por isso duas encomendas ao mesmo tempo nunca vendem o mesmo stock.
  // O MongoDB repete a transação sozinho se ela chocar com outra.
  let criadas;
  await mongoose.connection.transaction(async (session) => {
    const porProdutor = new Map();
    for (const [id, quantidade] of quantidades) {
      // Devolve o produto como estava antes de descer o stock: com o preço desse momento
      const produto = await Product.findOneAndUpdate(
        { _id: id, stock: { $gte: quantidade } },
        { $inc: { stock: -quantidade } },
        { session },
      );
      if (!produto) {
        const atual = await Product.findById(id).session(session);
        throw criarErro(
          409,
          atual
            ? `Só restam ${atual.stock} de "${atual.nome}"`
            : 'Um dos produtos já não está à venda',
        );
      }
      const chave = produto.produtor.toString();
      porProdutor.set(chave, [
        ...(porProdutor.get(chave) ?? []),
        {
          produto: produto._id,
          nome: produto.nome,
          unidade: produto.unidade,
          preco: produto.preco,
          quantidade,
        },
      ]);
    }

    const agora = new Date();
    criadas = await Order.create(
      [...porProdutor].map(([produtor, linhas]) => ({
        comprador: req.user.id,
        produtor,
        linhas,
        total: totalDe(linhas),
        ...entrega,
        historico: [{ estado: 'pendente', data: agora }],
      })),
      // Com uma sessão, o Mongoose exige que vários documentos sejam gravados por ordem
      { session, ordered: true },
    );
  });

  // Cada produtor fica logo a saber da sua encomenda
  for (const encomenda of criadas) {
    await avisar(
      req.app.get('io'),
      encomenda.produtor,
      {
        texto: `Nova encomenda de ${req.user.nome}: ${formatarEuros(encomenda.total)}.`,
        tipo: 'encomenda',
        ligacao: '/conta/encomendas',
      },
      'nova-encomenda',
      { id: encomenda._id },
    );
  }
  res.status(201).json(criadas.map((encomenda) => encomendaPublica(encomenda)));
});

// PATCH /api/orders/:id/estado: o produtor passa a encomenda ao estado seguinte
// (pendente → confirmada → pronta → entregue). Corpo: { estado }.
router.patch('/:id/estado', auth('produtor'), async (req, res) => {
  const encomenda = await Order.findById(req.params.id);
  if (!encomenda) {
    throw criarErro(404, 'Encomenda não encontrada');
  }
  if (!encomenda.produtor.equals(req.user.id)) {
    throw criarErro(403, 'Esta encomenda não é sua');
  }
  const estado = req.body?.estado;
  if (!ESTADOS.includes(estado)) {
    throw criarErro(400, 'Estado inválido');
  }
  const seguinte = ESTADOS[ESTADOS.indexOf(encomenda.estado) + 1];
  if (estado !== seguinte) {
    throw criarErro(
      409,
      seguinte
        ? `A encomenda está ${encomenda.estado}: o estado seguinte é ${seguinte}`
        : 'A encomenda já foi entregue',
    );
  }

  // Só muda se ninguém a tiver mudado entretanto (por exemplo, com um duplo clique)
  const atualizada = await Order.findOneAndUpdate(
    { _id: encomenda._id, estado: encomenda.estado },
    { estado, $push: { historico: { estado, data: new Date() } } },
    { returnDocument: 'after' },
  )
    .populate('comprador', 'nome email')
    .populate('produtor', 'produtor.nomeExploracao');
  if (!atualizada) {
    throw criarErro(409, 'A encomenda mudou entretanto. Recarregue a página.');
  }
  // O comprador vê a mudança no momento, em qualquer página em que esteja
  await avisar(
    req.app.get('io'),
    atualizada.comprador._id,
    {
      texto: `${atualizada.produtor.produtor.nomeExploracao} ${MUDANCAS[estado]}.`,
      tipo: 'encomenda',
      // Depois de entregue, a notificação leva logo ao formulário da avaliação
      ligacao:
        estado === 'entregue'
          ? `/encomendas/${atualizada._id}/avaliar`
          : '/encomendas',
    },
    'encomenda-atualizada',
    { id: atualizada._id, estado },
  );
  const [publica] = await comAvaliacoes([atualizada]);
  res.json(publica);
});

export default router;
