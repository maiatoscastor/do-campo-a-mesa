import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Auction } from '../models/Auction.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { DECISOES_DE_PRODUTOR, Report } from '../models/Report.js';
import { Review } from '../models/Review.js';
import { castigoAtivo, produtoresAVender, User } from '../models/User.js';
import { banir, suspender, tirarCastigo } from '../services/castigos.js';
import { estadoDosServicos } from '../services/servicos.js';
import { avisar, avisarAdministradores } from '../sockets/avisos.js';
import { pessoasNaSala } from '../sockets/leiloes.js';
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

// Os produtores com denúncias por decidir (os identificadores)
function produtoresPorDecidir() {
  return Report.distinct('produtor', { tipo: 'produtor', estado: 'pendente' });
}

// GET /api/admin/resumo: o que está à espera do administrador, para os números da navegação, dos
// separadores e do início. Conta-se por caso (uma avaliação ou um produtor), e não por denúncia: cinco
// denúncias da mesma avaliação são uma só decisão.
router.get('/resumo', async (req, res) => {
  const [produtoresPorValidar, avaliacoes, produtores] = await Promise.all([
    User.countDocuments({ 'produtor.validacao': 'pendente' }),
    avaliacoesPorDecidir(),
    produtoresPorDecidir(),
  ]);
  res.json({
    produtoresPorValidar,
    denunciasPorDecidir: avaliacoes.length + produtores.length,
    denunciasDeAvaliacoes: avaliacoes.length,
    denunciasDeProdutores: produtores.length,
  });
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
    // As canceladas não contam: não chegaram a ser vendas
    {
      $match: {
        createdAt: { $gte: desde, $lt: ate },
        estado: { $ne: 'cancelada' },
      },
    },
    { $group: { _id: null, quantas: { $sum: 1 }, valor: { $sum: '$total' } } },
  ]);
  return { quantas: grupo?.quantas ?? 0, valor: arredondar(grupo?.valor ?? 0) };
}

// Quantas linhas vêm nas listas do painel (as últimas encomendas e os últimos registos)
const NO_PAINEL = 10;

// GET /api/admin/painel: a aplicação em números, para o início e o painel do administrador. Os
// utilizadores por papel (e os produtores por estado: aprovados, por validar, rejeitados, suspensos
// e banidos), os produtos à venda, as encomendas dos últimos 30 dias e dos 30 anteriores (para
// comparar) e de sempre por estado, os leilões a decorrer (cada um com a licitação atual e quantas
// pessoas estão a ver) e marcados, as últimas encomendas e os últimos registos. Tudo contado na base
// de dados no momento do pedido.
router.get('/painel', async (req, res) => {
  const agora = new Date();
  const ha30Dias = new Date(agora.getTime() - 30 * DIA);
  const ha60Dias = new Date(agora.getTime() - 60 * DIA);
  // Os produtos à venda: de produtores aprovados e sem castigo em vigor
  const aVender = await User.distinct('_id', produtoresAVender(agora));
  const [
    porPapel,
    novos,
    produtos,
    ultimos30,
    anteriores30,
    leiloes,
    ultimasEncomendas,
    ultimosRegistos,
    produtoresPorValidacao,
    suspensos,
    banidos,
    encomendasPorEstado,
    aDecorrer,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$papel', quantos: { $sum: 1 } } }]),
    User.countDocuments({ createdAt: { $gte: ha30Dias } }),
    Product.countDocuments({ produtor: { $in: aVender } }),
    encomendasEntre(ha30Dias, agora),
    encomendasEntre(ha60Dias, ha30Dias),
    Auction.aggregate([
      { $match: { estado: { $in: ['agendado', 'ativo'] } } },
      { $group: { _id: '$estado', quantos: { $sum: 1 } } },
    ]),
    Order.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(NO_PAINEL)
      .populate('comprador', 'nome')
      .populate('produtor', 'produtor.nomeExploracao'),
    User.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(NO_PAINEL)
      .select(
        'nome papel produtor.nomeExploracao produtor.validacao exemplo createdAt',
      ),
    User.aggregate([
      { $match: { papel: 'produtor' } },
      { $group: { _id: '$produtor.validacao', quantos: { $sum: 1 } } },
    ]),
    User.countDocuments({
      'castigo.tipo': 'suspensao',
      'castigo.ate': { $gt: agora },
    }),
    User.countDocuments({ 'castigo.tipo': 'banimento' }),
    Order.aggregate([{ $group: { _id: '$estado', quantos: { $sum: 1 } } }]),
    Auction.find({ estado: 'ativo' })
      .sort({ terminaEm: 1 })
      .populate('produtor', 'produtor.nomeExploracao'),
  ]);
  // Quantas pessoas estão em cada sala (sem o Socket.io, nos testes, fica de fora)
  const io = req.app.get('io');
  const participantes = await Promise.all(
    aDecorrer.map(({ _id }) => (io ? pessoasNaSala(io, _id) : null)),
  );
  const contagem = (lista, chave) =>
    lista.find(({ _id }) => _id === chave)?.quantos ?? 0;

  res.json({
    utilizadores: {
      compradores: contagem(porPapel, 'comprador'),
      produtores: contagem(porPapel, 'produtor'),
      administradores: contagem(porPapel, 'admin'),
      novos,
      produtoresPorEstado: {
        aprovados: contagem(produtoresPorValidacao, 'aprovado'),
        porValidar: contagem(produtoresPorValidacao, 'pendente'),
        rejeitados: contagem(produtoresPorValidacao, 'rejeitado'),
        suspensos,
        banidos,
      },
    },
    produtos,
    encomendas: {
      ultimos30,
      anteriores30,
      porEstado: Object.fromEntries(
        encomendasPorEstado.map(({ _id, quantos }) => [_id, quantos]),
      ),
    },
    leiloes: {
      aDecorrer: contagem(leiloes, 'ativo'),
      marcados: contagem(leiloes, 'agendado'),
      lista: aDecorrer.map((leilao, i) => ({
        id: leilao._id,
        nome: leilao.nome,
        lote: leilao.lote,
        exemplo: leilao.exemplo,
        produtor: leilao.produtor && {
          id: leilao.produtor._id,
          nomeExploracao: leilao.produtor.produtor?.nomeExploracao,
        },
        licitacaoAtual: leilao.licitacaoAtual?.valor,
        numeroDeLicitacoes: leilao.numeroDeLicitacoes,
        terminaEm: leilao.terminaEm,
        participantes: participantes[i],
      })),
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

// GET /api/admin/servicos: o estado de cada parte da aplicação (API, MongoDB, Socket.io,
// armazenamento das imagens e documentação Swagger), verificado no momento do pedido
router.get('/servicos', async (req, res) => {
  res.json(await estadoDosServicos(req.app.get('io')));
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

// GET /api/admin/denuncias?tipo=…&estado=…&pagina=…: os casos denunciados, avaliações (por omissão)
// ou produtores (?tipo=produtor). Por omissão, os que têm denúncias por decidir, primeiro os que
// esperam há mais tempo, cada um com essas denúncias; com ?estado=decidida, os que já foram
// decididos, dos mais recentes para os mais antigos, com todas as denúncias que tiveram.
router.get('/denuncias', async (req, res) => {
  const decididas = req.query.estado === 'decidida';
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  if (req.query.tipo === 'produtor') {
    res.json(await casosDeProdutores(decididas, pagina));
    return;
  }
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

// Um produtor denunciado, como o administrador o vê: quem é, o castigo em vigor (se houver), quantos
// avisos e suspensões já teve (cada decisão conta uma vez, mesmo que tenha decidido várias denúncias)
// e as denúncias, com quem as fez, o motivo e, nas decididas, a decisão.
function casoDeProdutor(produtor, denuncias, historico) {
  const castigo = castigoAtivo(produtor);
  return {
    produtor: {
      id: produtor._id,
      nome: produtor.nome,
      nomeExploracao: produtor.produtor.nomeExploracao,
      localizacao: produtor.produtor.localizacao,
      exemplo: produtor.exemplo,
      castigo: castigo && {
        tipo: castigo.tipo,
        ate: castigo.ate,
        motivo: castigo.motivo,
        desde: castigo.desde,
      },
    },
    historico: {
      avisos: historico.get(`${produtor._id}:aviso`) ?? 0,
      suspensoes: historico.get(`${produtor._id}:suspensao`) ?? 0,
      banimentos: historico.get(`${produtor._id}:banimento`) ?? 0,
    },
    denuncias: denuncias.map((denuncia) => ({
      id: denuncia._id,
      motivo: denuncia.motivo,
      descricao: denuncia.descricao,
      estado: denuncia.estado,
      decisao: denuncia.decisao,
      motivoDaDecisao: denuncia.motivoDaDecisao,
      decididaEm: denuncia.decididaEm,
      data: denuncia.createdAt,
      autor: { id: denuncia.autor._id, nome: denuncia.autor.nome },
    })),
  };
}

// Quantos avisos e suspensões teve cada produtor, num Map de "id:decisao" para o número. Cada decisão
// do administrador marca todas as denúncias por decidir com a mesma data, por isso conta-se uma vez.
async function historicoDe(ids) {
  const grupos = await Report.aggregate([
    {
      $match: {
        tipo: 'produtor',
        produtor: { $in: ids },
        estado: 'decidida',
        decisao: { $in: ['aviso', 'suspensao', 'banimento'] },
      },
    },
    {
      $group: {
        _id: { produtor: '$produtor', decisao: '$decisao', em: '$decididaEm' },
      },
    },
    {
      $group: {
        _id: { produtor: '$_id.produtor', decisao: '$_id.decisao' },
        quantas: { $sum: 1 },
      },
    },
  ]);
  return new Map(
    grupos.map(({ _id, quantas }) => [
      `${_id.produtor}:${_id.decisao}`,
      quantas,
    ]),
  );
}

// Os casos dos produtores denunciados, por decidir ou decididos (ver GET /api/admin/denuncias)
async function casosDeProdutores(decididas, pagina) {
  const porDecidir = await produtoresPorDecidir();
  const grupos = decididas
    ? await Report.aggregate([
        {
          $match: {
            tipo: 'produtor',
            estado: 'decidida',
            produtor: { $nin: porDecidir },
          },
        },
        { $group: { _id: '$produtor', ultima: { $max: '$decididaEm' } } },
        { $sort: { ultima: -1, _id: 1 } },
        { $skip: (pagina - 1) * POR_PAGINA },
        { $limit: POR_PAGINA + 1 },
      ])
    : await Report.aggregate([
        { $match: { tipo: 'produtor', estado: 'pendente' } },
        { $group: { _id: '$produtor', primeira: { $min: '$createdAt' } } },
        { $sort: { primeira: 1, _id: 1 } },
        { $skip: (pagina - 1) * POR_PAGINA },
        { $limit: POR_PAGINA + 1 },
      ]);
  const temMais = grupos.length > POR_PAGINA;
  const ids = grupos.slice(0, POR_PAGINA).map(({ _id }) => _id);

  const [produtores, denuncias, historico] = await Promise.all([
    User.find({ _id: { $in: ids } }),
    Report.find({
      tipo: 'produtor',
      produtor: { $in: ids },
      estado: decididas ? 'decidida' : 'pendente',
    })
      .sort({ createdAt: 1 })
      .populate('autor', 'nome'),
    historicoDe(ids),
  ]);
  // Pela ordem da lista (o find não a garante)
  const casos = ids
    .map((id) => produtores.find(({ _id }) => _id.equals(id)))
    .filter(Boolean)
    .map((produtor) =>
      casoDeProdutor(
        produtor,
        denuncias.filter((denuncia) => denuncia.produtor.equals(produtor._id)),
        historico,
      ),
    );
  return { porDecidir: porDecidir.length, casos, temMais };
}

// A data até quando fica suspenso: no futuro e, no máximo, daqui a um ano
function dataDaSuspensao(valor, agora) {
  const ate = typeof valor === 'string' ? new Date(valor) : null;
  if (!ate || Number.isNaN(ate.getTime())) {
    return { erro: 'Escolha até quando fica suspenso' };
  }
  if (ate <= agora) {
    return { erro: 'A data tem de ser no futuro' };
  }
  if (ate > new Date(agora.getTime() + 366 * DIA)) {
    return { erro: 'A suspensão pode ir, no máximo, até daqui a um ano' };
  }
  return { ate };
}

// PATCH /api/admin/produtores/:id/moderacao: o administrador decide as denúncias por decidir de um
// produtor. Corpo: { decisao: 'rejeitada' | 'aviso' | 'suspensao' | 'banimento', motivo, ate } (a
// data só na suspensão). Na suspensão, os produtos e a página saem da loja até à data, e os leilões
// por acabar são cancelados. No banimento, a conta fica bloqueada até ser desbloqueada, e também as
// encomendas por entregar são canceladas. O produtor recebe a decisão com o motivo; quem denunciou
// recebe a decisão (numa rejeição, com o motivo; num castigo, sem os pormenores, que são entre o
// administrador e o produtor).
router.patch('/produtores/:id/moderacao', async (req, res) => {
  const agora = new Date();
  const { decisao } = req.body ?? {};
  const motivo =
    typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  const detalhes = {};
  if (!DECISOES_DE_PRODUTOR.includes(decisao)) {
    detalhes.decisao = 'Escolha rejeitar, dar um aviso, suspender ou banir';
  }
  if (!motivo) {
    detalhes.motivo = 'Escreva o motivo da decisão';
  } else if (motivo.length > 500) {
    detalhes.motivo = 'O motivo é demasiado comprido';
  }
  const suspensao =
    decisao === 'suspensao' ? dataDaSuspensao(req.body?.ate, agora) : null;
  if (suspensao?.erro) {
    detalhes.ate = suspensao.erro;
  }
  if (Object.keys(detalhes).length > 0) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), { detalhes });
  }

  const produtor = await User.findOne({
    _id: req.params.id,
    papel: 'produtor',
  });
  if (!produtor) {
    throw criarErro(404, 'Produtor não encontrado');
  }
  const pendentes = await Report.find({
    tipo: 'produtor',
    produtor: produtor._id,
    estado: 'pendente',
  });
  // Só se decide o que está por decidir (outro administrador pode ter acabado de o fazer)
  const { modifiedCount } = await Report.updateMany(
    { _id: { $in: pendentes.map(({ _id }) => _id) }, estado: 'pendente' },
    {
      estado: 'decidida',
      decisao,
      motivoDaDecisao: motivo,
      decididaEm: agora,
    },
  );
  if (modifiedCount === 0) {
    throw criarErro(409, 'Não há denúncias deste produtor por decidir');
  }

  const io = req.app.get('io');
  const nome = produtor.produtor.nomeExploracao;
  if (decisao === 'suspensao') {
    await suspender(io, produtor, {
      ate: suspensao.ate,
      motivo,
      admin: req.user.id,
    });
  } else if (decisao === 'banimento') {
    await banir(io, produtor, { motivo, admin: req.user.id });
  } else if (decisao === 'aviso') {
    await avisar(io, produtor._id, {
      texto: `Recebeu um aviso da administração sobre a sua conta de produtor. Motivo: ${motivo}`,
      tipo: 'conta',
      ligacao: '/',
    });
  }
  const autores = [...new Set(pendentes.map(({ autor }) => String(autor)))];
  for (const autor of autores) {
    await avisar(io, autor, {
      texto:
        decisao === 'rejeitada'
          ? `A sua denúncia de ${nome} foi analisada e não vai haver medidas. Motivo: ${motivo}`
          : `A sua denúncia de ${nome} foi analisada e foram tomadas medidas. Obrigado por ajudar.`,
      tipo: 'denuncia',
      ligacao: '/produtores',
    });
  }
  await avisarAdministradores(io, null, 'denuncias-mudaram', {});

  const [atualizado, denuncias, historico] = await Promise.all([
    User.findById(produtor._id),
    Report.find({ tipo: 'produtor', produtor: produtor._id })
      .sort({ createdAt: 1 })
      .populate('autor', 'nome'),
    historicoDe([produtor._id]),
  ]);
  res.json(casoDeProdutor(atualizado, denuncias, historico));
});

// DELETE /api/admin/produtores/:id/castigo: o administrador levanta a suspensão antes do fim, ou
// desbloqueia uma conta banida. O produtor é avisado, e os produtos e a página voltam logo à loja (as
// encomendas canceladas ficam canceladas). Responde 204.
router.delete('/produtores/:id/castigo', async (req, res) => {
  const io = req.app.get('io');
  if (!(await tirarCastigo(io, req.params.id))) {
    throw criarErro(404, 'Este produtor não tem nenhum castigo');
  }
  await avisarAdministradores(io, null, 'denuncias-mudaram', {});
  res.status(204).end();
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
