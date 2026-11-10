import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Auction } from '../models/Auction.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Report } from '../models/Report.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { avisar, avisarAdministradores } from '../sockets/avisos.js';
import { arredondar } from '../utils/dinheiro.js';
import { criarErro } from '../utils/erro.js';

const router = Router();

// Quantas avaliações denunciadas vêm de cada vez ("Carregar mais" pede as seguintes)
const POR_PAGINA = 10;

const DIA = 24 * 60 * 60 * 1000;

// Todas as rotas deste ficheiro são só para administradores
router.use(auth('admin'));

// As avaliações com denúncias por decidir (os identificadores)
function avaliacoesPorDecidir() {
  return Report.distinct('avaliacao', {
    tipo: 'avaliacao',
    estado: 'pendente',
  });
}

// GET /api/admin/resumo: o que está à espera do administrador, para os números da navegação, dos
// separadores e do início
router.get('/resumo', async (req, res) => {
  const [produtoresPorValidar, porDecidir] = await Promise.all([
    User.countDocuments({ 'produtor.validacao': 'pendente' }),
    avaliacoesPorDecidir(),
  ]);
  res.json({ produtoresPorValidar, denunciasPorDecidir: porDecidir.length });
});

// GET /api/admin/produtores/pendentes: os produtores à espera de validação, primeiro os mais antigos
router.get('/produtores/pendentes', async (req, res) => {
  const pendentes = await User.find({
    'produtor.validacao': 'pendente',
  }).sort({ createdAt: 1 });
  res.json(pendentes.map((produtor) => produtor.publico()));
});

// O número e o valor das encomendas feitas num intervalo de tempo
async function encomendasEntre(desde, ate) {
  const [grupo] = await Order.aggregate([
    { $match: { createdAt: { $gte: desde, $lt: ate } } },
    { $group: { _id: null, quantas: { $sum: 1 }, valor: { $sum: '$total' } } },
  ]);
  return { quantas: grupo?.quantas ?? 0, valor: arredondar(grupo?.valor ?? 0) };
}

// GET /api/admin/painel: a aplicação em números, para o início do administrador. Os utilizadores por
// papel, os produtos à venda (de produtores aprovados), as encomendas dos últimos 30 dias e dos 30
// anteriores (para comparar), os leilões a decorrer e marcados, as últimas encomendas e os últimos
// registos. Tudo contado na base de dados no momento do pedido.
router.get('/painel', async (req, res) => {
  const agora = new Date();
  const ha30Dias = new Date(agora.getTime() - 30 * DIA);
  const ha60Dias = new Date(agora.getTime() - 60 * DIA);
  const aprovados = await User.distinct('_id', {
    papel: 'produtor',
    'produtor.validacao': 'aprovado',
  });
  const [
    porPapel,
    novos,
    produtos,
    ultimos30,
    anteriores30,
    leiloes,
    ultimasEncomendas,
    ultimosRegistos,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$papel', quantos: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: ha30Dias } }),
    Product.countDocuments({ produtor: { $in: aprovados } }),
    encomendasEntre(ha30Dias, agora),
    encomendasEntre(ha60Dias, ha30Dias),
    Auction.aggregate([
      { $match: { estado: { $in: ['agendado', 'ativo'] } } },
      { $group: { _id: '$estado', quantos: { $sum: 1 } } },
    ]),
    Order.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('comprador', 'nome')
      .populate('produtor', 'produtor.nomeExploracao'),
    User.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .select(
        'nome papel produtor.nomeExploracao produtor.validacao exemplo createdAt',
      ),
  ]);
  const contagem = (lista, chave) =>
    lista.find(({ _id }) => _id === chave)?.quantos ?? 0;

  res.json({
    utilizadores: {
      compradores: contagem(porPapel, 'comprador'),
      produtores: contagem(porPapel, 'produtor'),
      administradores: contagem(porPapel, 'admin'),
      novos,
    },
    produtos,
    encomendas: { ultimos30, anteriores30 },
    leiloes: {
      aDecorrer: contagem(leiloes, 'ativo'),
      marcados: contagem(leiloes, 'agendado'),
    },
    ultimasEncomendas: ultimasEncomendas.map((encomenda) => ({
      id: encomenda._id,
      total: encomenda.total,
      estado: encomenda.estado,
      origem: encomenda.origem,
      data: encomenda.createdAt,
      comprador: encomenda.comprador?.nome,
      produtor: encomenda.produtor && {
        id: encomenda.produtor._id,
        nomeExploracao: encomenda.produtor.produtor?.nomeExploracao,
      },
    })),
    ultimosRegistos: ultimosRegistos.map((utilizador) => ({
      id: utilizador._id,
      nome: utilizador.nome,
      papel: utilizador.papel,
      nomeExploracao: utilizador.produtor?.nomeExploracao,
      validacao: utilizador.produtor?.validacao,
      exemplo: utilizador.exemplo,
      data: utilizador.createdAt,
    })),
  });
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
  // Os outros administradores veem o número de produtores por validar a descer
  await avisarAdministradores(
    req.app.get('io'),
    null,
    'produtores-mudaram',
    {},
  );
  res.json(produtor.publico());
});

// Uma avaliação denunciada, como o administrador a vê: a avaliação toda (com o nome completo de quem
// a escreveu), a decisão que já houver e as denúncias, com quem as fez. Diz-se quando quem denunciou
// é o próprio produtor avaliado, para se perceber se está só a tentar esconder uma avaliação má.
function casoPublico(avaliacao, denuncias) {
  const { autor, produtor, moderacao } = avaliacao;
  return {
    avaliacao: {
      id: avaliacao._id,
      classificacao: avaliacao.classificacao,
      comentario: avaliacao.comentario,
      produtos: avaliacao.produtos,
      resposta: avaliacao.resposta,
      data: avaliacao.createdAt,
      editadaEm: avaliacao.editadaEm,
      visivel: avaliacao.visivel,
      autor: { id: autor._id, nome: autor.nome },
      produtor: {
        id: produtor._id,
        nomeExploracao: produtor.produtor.nomeExploracao,
      },
      moderacao: moderacao && {
        decisao: moderacao.decisao,
        motivo: moderacao.motivo,
        data: moderacao.data,
      },
    },
    denuncias: denuncias.map((denuncia) => ({
      id: denuncia._id,
      motivo: denuncia.motivo,
      descricao: denuncia.descricao,
      estado: denuncia.estado,
      decisao: denuncia.decisao,
      data: denuncia.createdAt,
      autor: {
        id: denuncia.autor._id,
        nome: denuncia.autor.nome,
        eOProdutor: denuncia.autor._id.equals(produtor._id),
      },
    })),
  };
}

// As avaliações dos casos, com quem as escreveu e o produtor avaliado
function lerAvaliacoes(filtro) {
  return Review.find(filtro)
    .populate('autor', 'nome')
    .populate('produtor', 'produtor.nomeExploracao');
}

// GET /api/admin/denuncias?estado=…&pagina=…: as avaliações denunciadas. Por omissão, as que têm
// denúncias por decidir, primeiro as que esperam há mais tempo, cada uma com essas denúncias; com
// ?estado=decidida, as que já foram decididas, das mais recentes para as mais antigas, com todas
// as denúncias que tiveram.
router.get('/denuncias', async (req, res) => {
  const decididas = req.query.estado === 'decidida';
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const porDecidir = await avaliacoesPorDecidir();

  // Pede-se uma a mais só para saber se há mais páginas
  let ids;
  if (decididas) {
    const lista = await Review.find({
      moderacao: { $exists: true },
      _id: { $nin: porDecidir },
    })
      .sort({ 'moderacao.data': -1 })
      .skip((pagina - 1) * POR_PAGINA)
      .limit(POR_PAGINA + 1)
      .select('_id');
    ids = lista.map(({ _id }) => _id);
  } else {
    const grupos = await Report.aggregate([
      { $match: { tipo: 'avaliacao', estado: 'pendente' } },
      { $group: { _id: '$avaliacao', primeira: { $min: '$createdAt' } } },
      { $sort: { primeira: 1, _id: 1 } },
      { $skip: (pagina - 1) * POR_PAGINA },
      { $limit: POR_PAGINA + 1 },
    ]);
    ids = grupos.map(({ _id }) => _id);
  }
  const temMais = ids.length > POR_PAGINA;
  ids = ids.slice(0, POR_PAGINA);

  const [avaliacoes, denuncias] = await Promise.all([
    lerAvaliacoes({ _id: { $in: ids } }),
    Report.find({
      avaliacao: { $in: ids },
      ...(decididas ? {} : { estado: 'pendente' }),
    })
      .sort({ createdAt: 1 })
      .populate('autor', 'nome'),
  ]);
  // Pela ordem da lista (o find não a garante)
  const casos = ids
    .map((id) => avaliacoes.find(({ _id }) => _id.equals(id)))
    .filter(Boolean)
    .map((avaliacao) =>
      casoPublico(
        avaliacao,
        denuncias.filter((denuncia) =>
          denuncia.avaliacao.equals(avaliacao._id),
        ),
      ),
    );
  res.json({ porDecidir: porDecidir.length, casos, temMais });
});

// PATCH /api/admin/avaliacoes/:id/moderacao: o administrador mantém ou oculta uma avaliação. Corpo:
// { decisao: 'mantida' | 'ocultada', motivo }. Uma avaliação oculta deixa de aparecer e de contar
// nas médias. Também serve para voltar atrás. As denúncias por decidir ficam decididas, e quem as fez
// recebe a decisão; quem escreveu a avaliação é avisado quando ela é ocultada ou volta a aparecer.
router.patch('/avaliacoes/:id/moderacao', async (req, res) => {
  const { decisao } = req.body ?? {};
  const motivo =
    typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  const detalhes = {};
  if (decisao !== 'mantida' && decisao !== 'ocultada') {
    detalhes.decisao = 'Escolha manter ou ocultar a avaliação';
  }
  if (!motivo) {
    detalhes.motivo = 'Escreva o motivo da decisão';
  } else if (motivo.length > 500) {
    detalhes.motivo = 'O motivo é demasiado comprido';
  }
  if (Object.keys(detalhes).length > 0) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), { detalhes });
  }

  const [avaliacao] = await lerAvaliacoes({ _id: req.params.id });
  if (!avaliacao) {
    throw criarErro(404, 'Avaliação não encontrada');
  }
  const estavaVisivel = avaliacao.visivel;
  avaliacao.visivel = decisao === 'mantida';
  avaliacao.moderacao = {
    decisao,
    motivo,
    data: new Date(),
    admin: req.user.id,
  };
  await avaliacao.save();

  // Quem denunciou e ainda esperava pela decisão
  const porAvisar = await Report.find({
    avaliacao: avaliacao._id,
    estado: 'pendente',
  }).distinct('autor');
  await Report.updateMany(
    { avaliacao: avaliacao._id, estado: 'pendente' },
    { estado: 'decidida', decisao },
  );

  const io = req.app.get('io');
  const nome = avaliacao.produtor.produtor.nomeExploracao;
  if (estavaVisivel !== avaliacao.visivel) {
    await avisar(
      io,
      avaliacao.autor._id,
      {
        texto: avaliacao.visivel
          ? `A sua avaliação a ${nome} voltou a aparecer. Motivo: ${motivo}`
          : `A sua avaliação a ${nome} foi ocultada pelo administrador. Motivo: ${motivo}`,
        tipo: 'denuncia',
        ligacao: '/encomendas',
      },
      'avaliacao-moderada',
      { id: avaliacao._id },
    );
  }
  for (const autor of porAvisar) {
    await avisar(io, autor, {
      texto:
        decisao === 'ocultada'
          ? `A avaliação a ${nome} que denunciou foi ocultada. Motivo: ${motivo}`
          : `A avaliação a ${nome} que denunciou vai continuar visível. Motivo: ${motivo}`,
      tipo: 'denuncia',
      ligacao: `/produtores/${avaliacao.produtor._id}/avaliacoes`,
    });
  }
  await avisarAdministradores(io, null, 'denuncias-mudaram', {});

  const denuncias = await Report.find({ avaliacao: avaliacao._id })
    .sort({ createdAt: 1 })
    .populate('autor', 'nome');
  res.json(casoPublico(avaliacao, denuncias));
});

export default router;
