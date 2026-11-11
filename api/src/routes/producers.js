import { Router } from 'express';
import { auth, authOpcional } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Report } from '../models/Report.js';
import { produtoresAVender, User } from '../models/User.js';
import {
  mediasDosProdutores,
  resumoDoProdutor,
} from '../services/avaliacoes.js';
import { estatisticasDoProdutor, PERIODOS } from '../services/estatisticas.js';
import { avisarAdministradores } from '../sockets/avisos.js';
import { criarErro, problemasDe } from '../utils/erro.js';
import {
  apagarImagem,
  guardarImagem,
  receberImagem,
} from '../utils/imagens.js';
import { expressao } from '../utils/pesquisa.js';

const router = Router();

// "Mais requisitados" quer dizer com mais encomendas entregues nestes últimos dias
const DIAS_DOS_REQUISITADOS = 90;
const DIA = 24 * 60 * 60 * 1000;

// O tamanho mínimo da capa (recomendado: 1600 × 500 px) e do logótipo
const MINIMO_DA_CAPA = { largura: 1200, altura: 300 };
const MINIMO_DO_LOGOTIPO = { largura: 200, altura: 200 };

// O que a página pública de um produtor mostra. Nunca o email nem outros dados da conta.
function paginaDoProdutor(utilizador) {
  const {
    nomeExploracao,
    localizacao,
    descricao,
    capaUrl,
    logotipoUrl,
    levantamento,
    contactos,
    ponto,
  } = utilizador.produtor;
  return {
    id: utilizador._id,
    nomeExploracao,
    localizacao,
    descricao,
    capaUrl,
    logotipoUrl,
    levantamento,
    contactos,
    ponto,
    exemplo: utilizador.exemplo,
    desde: utilizador.createdAt,
  };
}

// Um texto do pedido; vazio conta como "sem valor", para se poder apagar um campo
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() || undefined : undefined;
}

// O horário de levantamento do pedido, ou nenhum (null ou vazio tira-o)
function levantamentoDoPedido(valor) {
  if (!valor || typeof valor !== 'object') {
    return undefined;
  }
  return {
    dias: Array.isArray(valor.dias) ? valor.dias : [],
    abre: texto(valor.abre),
    fecha: texto(valor.fecha),
    nota: texto(valor.nota),
  };
}

// Os contactos do pedido. Do Instagram guarda-se só o nome (sem @ nem o endereço à frente).
function contactosDoPedido(valor) {
  if (!valor || typeof valor !== 'object') {
    return undefined;
  }
  const contactos = {
    telefone: texto(valor.telefone),
    site: texto(valor.site),
    instagram: texto(valor.instagram)
      ?.replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/$/, ''),
    facebook: texto(valor.facebook),
  };
  return Object.values(contactos).some(Boolean) ? contactos : undefined;
}

// O ponto no mapa do pedido, ou nenhum (null tira-o)
function pontoDoPedido(valor) {
  if (!valor || typeof valor !== 'object') {
    return undefined;
  }
  const numero = (n) => (typeof n === 'number' ? n : undefined);
  return { lat: numero(valor.lat), lng: numero(valor.lng) };
}

// Quantas encomendas cada produtor entregou desde uma data, num Map do identificador do produtor para
// o número (a data é a do passo "entregue" do histórico da encomenda)
async function entreguesDesde(desde) {
  const grupos = await Order.aggregate([
    {
      $match: {
        estado: 'entregue',
        historico: {
          $elemMatch: { estado: 'entregue', data: { $gte: desde } },
        },
      },
    },
    { $group: { _id: '$produtor', quantas: { $sum: 1 } } },
  ]);
  return new Map(grupos.map(({ _id, quantas }) => [String(_id), quantas]));
}

// As ordens da página dos produtores. A lista já vem por ordem alfabética e o sort do JavaScript é
// estável: com o mesmo valor, os produtores ficam por ordem alfabética.
const ORDENS = {
  // Mais encomendas entregues nos últimos 90 dias
  requisitados: async (lista) => {
    const entregues = await entreguesDesde(
      new Date(Date.now() - DIAS_DOS_REQUISITADOS * DIA),
    );
    const de = ({ id }) => entregues.get(id) ?? 0;
    return lista.sort((a, b) => de(b) - de(a));
  },
  // Média mais alta e, com a mesma média, mais avaliações; os que não têm avaliações ficam no fim
  avaliados: (lista) =>
    lista.sort(
      (a, b) =>
        (b.avaliacao?.media ?? 0) - (a.avaliacao?.media ?? 0) ||
        (b.avaliacao?.total ?? 0) - (a.avaliacao?.total ?? 0),
    ),
  // Os que se registaram há menos tempo
  novos: (lista) => lista.sort((a, b) => b.desde - a.desde),
};

// GET /api/producers: os produtores a vender (aprovados e sem castigo), abertos a todos, com o logótipo, quantos produtos têm
// e a média das avaliações (para os cartões). Parâmetros, todos opcionais:
// - comProdutos=true: só os que têm produtos (é o que usam os filtros do catálogo, para nenhum filtro
//   dar zero resultados);
// - q: pesquisa no nome, no concelho e na freguesia;
// - ordem: requisitados, avaliados ou novos (sem ordem, por ordem alfabética);
// - favoritos=true: só os favoritos de quem tem a sessão (sem sessão, 401).
router.get('/', authOpcional, async (req, res) => {
  const filtro = produtoresAVender();
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    const procura = expressao(q);
    filtro.$or = [
      { 'produtor.nomeExploracao': procura },
      { 'produtor.localizacao.nomeConcelho': procura },
      { 'produtor.localizacao.nomeFreguesia': procura },
    ];
  }
  if (req.query.favoritos === 'true') {
    if (!req.user) {
      throw criarErro(401, 'Sessão inválida ou expirada');
    }
    const eu = await User.findById(req.user.id).select('favoritos');
    filtro._id = { $in: eu?.favoritos ?? [] };
  }

  const [produtos, produtores] = await Promise.all([
    Product.aggregate([{ $group: { _id: '$produtor', quantos: { $sum: 1 } } }]),
    User.find(filtro)
      .select(
        'produtor.nomeExploracao produtor.localizacao produtor.logotipoUrl exemplo createdAt',
      )
      .sort({ 'produtor.nomeExploracao': 1 }),
  ]);
  const quantos = new Map(
    produtos.map(({ _id, quantos: n }) => [String(_id), n]),
  );
  const escolhidos =
    req.query.comProdutos === 'true'
      ? produtores.filter(({ id }) => quantos.has(id))
      : produtores;
  const medias = await mediasDosProdutores(escolhidos.map(({ _id }) => _id));

  let lista = escolhidos.map(({ id, produtor, exemplo, createdAt }) => ({
    id,
    nomeExploracao: produtor.nomeExploracao,
    localizacao: produtor.localizacao,
    logotipoUrl: produtor.logotipoUrl,
    produtos: quantos.get(id) ?? 0,
    avaliacao: medias.get(id),
    exemplo,
    desde: createdAt,
  }));
  const ordenar = ORDENS[req.query.ordem];
  if (ordenar) {
    lista = await ordenar(lista);
  }
  res.json(lista);
});

// O produtor com sessão (para as rotas /eu)
async function produtorDaSessao(req) {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador?.produtor) {
    throw criarErro(401, 'Sessão inválida ou expirada');
  }
  return utilizador;
}

// A página do próprio produtor, com o estado da validação. É a resposta de todas as rotas /eu, para
// o editor ficar sempre com os mesmos dados depois de cada mudança.
function paginaPropria(utilizador) {
  return {
    ...paginaDoProdutor(utilizador),
    validacao: utilizador.produtor.validacao,
  };
}

// GET /api/producers/eu: a página do produtor com sessão, mesmo antes de ser aprovado (para a editar
// e pré-visualizar)
router.get('/eu', auth('produtor'), async (req, res) => {
  const utilizador = await produtorDaSessao(req);
  res.json({
    ...paginaPropria(utilizador),
    avaliacao: await resumoDoProdutor(utilizador._id),
  });
});

// GET /api/producers/eu/estatisticas?periodo=7|30|90|365: as estatísticas do produtor com sessão nos
// últimos dias escolhidos (por omissão, 30): as vendas comparadas com o período anterior, as vendas
// no gráfico (por dia, semana ou mês), os produtos mais vendidos, as encomendas por estado, os
// leilões que acabaram e as avaliações
router.get('/eu/estatisticas', auth('produtor'), async (req, res) => {
  const dias = Number(req.query.periodo ?? 30);
  if (!PERIODOS[dias]) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), {
      detalhes: { periodo: 'Escolha 7, 30, 90 ou 365 dias' },
    });
  }
  res.json(await estatisticasDoProdutor(req.user.id, dias));
});

// PATCH /api/producers/eu: o produtor muda a sua página. Só os campos enviados mudam; um campo
// vazio (ou null) tira o que lá estava. Corpo: { nomeExploracao, concelho, freguesia, descricao,
// levantamento: { dias, abre, fecha, nota }, contactos: { telefone, site, instagram, facebook },
// ponto: { lat, lng } }.
router.patch('/eu', auth('produtor'), async (req, res) => {
  const utilizador = await produtorDaSessao(req);
  const corpo = req.body ?? {};
  const produtor = utilizador.produtor;

  if ('nomeExploracao' in corpo) {
    produtor.nomeExploracao = texto(corpo.nomeExploracao);
  }
  if ('concelho' in corpo || 'freguesia' in corpo) {
    produtor.localizacao = {
      concelho: texto(corpo.concelho),
      freguesia: texto(corpo.freguesia),
    };
  }
  if ('descricao' in corpo) {
    produtor.descricao = texto(corpo.descricao);
  }
  if ('levantamento' in corpo) {
    produtor.levantamento = levantamentoDoPedido(corpo.levantamento);
  }
  if ('contactos' in corpo) {
    produtor.contactos = contactosDoPedido(corpo.contactos);
  }
  if ('ponto' in corpo) {
    produtor.ponto = pontoDoPedido(corpo.ponto);
  }

  // Valida tudo de uma vez, para o formulário mostrar todos os problemas juntos
  const detalhes = await problemasDe(utilizador, ['passwordHash']);
  if (Object.keys(detalhes).length > 0) {
    throw Object.assign(criarErro(400, 'Dados inválidos'), { detalhes });
  }
  await utilizador.save();
  res.json(paginaPropria(utilizador));
});

// Põe ou troca uma imagem da página (a capa ou o logótipo) e apaga a anterior
function rotasDaImagem(campo, minimo) {
  const trocar = async (req, res) => {
    const utilizador = await produtorDaSessao(req);
    const anterior = utilizador.produtor[campo];
    utilizador.produtor[campo] = await guardarImagem(req.file, minimo);
    await utilizador.save({ validateModifiedOnly: true });
    await apagarImagem(anterior);
    res.json(paginaPropria(utilizador));
  };
  const tirar = async (req, res) => {
    const utilizador = await produtorDaSessao(req);
    await apagarImagem(utilizador.produtor[campo]);
    utilizador.produtor[campo] = undefined;
    await utilizador.save({ validateModifiedOnly: true });
    res.json(paginaPropria(utilizador));
  };
  return { trocar, tirar };
}

const capa = rotasDaImagem('capaUrl', MINIMO_DA_CAPA);
const logotipo = rotasDaImagem('logotipoUrl', MINIMO_DO_LOGOTIPO);

// PUT e DELETE /api/producers/eu/capa e /api/producers/eu/logotipo (formulário com o campo "imagem")
router.put('/eu/capa', auth('produtor'), receberImagem, capa.trocar);
router.delete('/eu/capa', auth('produtor'), capa.tirar);
router.put('/eu/logotipo', auth('produtor'), receberImagem, logotipo.trocar);
router.delete('/eu/logotipo', auth('produtor'), logotipo.tirar);

// Um produtor a vender que se pode pôr nos favoritos: existe, e não é quem faz o pedido
async function produtorParaFavorito(req) {
  const produtor = await User.findOne({
    ...produtoresAVender(),
    _id: req.params.id,
  }).select('_id');
  if (!produtor) {
    throw criarErro(404, 'Produtor não encontrado');
  }
  if (produtor._id.equals(req.user.id)) {
    throw criarErro(400, 'A sua própria página não pode ir para os favoritos');
  }
  return produtor;
}

// PUT /api/producers/:id/favorito: põe o produtor nos favoritos de quem tem a sessão. Pôr duas vezes
// dá o mesmo resultado ($addToSet não repete), por isso dois toques seguidos não estragam nada.
// Responde 204. O administrador não compra, por isso não tem favoritos (403).
router.put('/:id/favorito', auth('comprador', 'produtor'), async (req, res) => {
  const produtor = await produtorParaFavorito(req);
  await User.updateOne(
    { _id: req.user.id },
    { $addToSet: { favoritos: produtor._id } },
  );
  res.status(204).end();
});

// DELETE /api/producers/:id/favorito: tira o produtor dos favoritos. Responde 204, também se já lá
// não estava. Não exige que o produtor ainda exista, para se poder tirar um que saiu da loja.
router.delete(
  '/:id/favorito',
  auth('comprador', 'produtor'),
  async (req, res) => {
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { favoritos: req.params.id } },
    );
    res.status(204).end();
  },
);

// O produtor do endereço, se estiver a vender (aprovado e sem castigo); senão, 404
async function produtorAVender(id) {
  const utilizador = await User.findOne({ ...produtoresAVender(), _id: id });
  if (!utilizador) {
    throw criarErro(404, 'Produtor não encontrado');
  }
  return utilizador;
}

// GET /api/producers/:id: a página pública de um produtor a vender (aprovado e sem castigo). Com
// sessão (opcional), diz também se a pessoa tem uma denúncia deste produtor por decidir (denunciado),
// para a página mostrar "Denunciado" em vez de deixar denunciar outra vez.
router.get('/:id', authOpcional, async (req, res) => {
  const utilizador = await produtorAVender(req.params.id);
  const denunciado = req.user
    ? Boolean(
        await Report.exists({
          tipo: 'produtor',
          produtor: utilizador._id,
          autor: req.user.id,
          estado: 'pendente',
        }),
      )
    : undefined;
  res.json({
    ...paginaDoProdutor(utilizador),
    avaliacao: await resumoDoProdutor(utilizador._id),
    ...(denunciado === undefined ? {} : { denunciado }),
  });
});

// POST /api/producers/:id/denuncias: alguém com sessão denuncia um produtor. Corpo: { motivo,
// descricao } (a descrição é obrigatória no motivo "outro"). Cada pessoa só tem uma denúncia de cada
// produtor por decidir; depois da decisão, pode voltar a denunciar. A denúncia não muda nada sozinha:
// fica à espera do administrador. Responde 201.
router.post('/:id/denuncias', auth(), async (req, res) => {
  const produtor = await produtorAVender(req.params.id);
  if (produtor._id.equals(req.user.id)) {
    throw criarErro(403, 'Não pode denunciar a sua própria página');
  }
  const porDecidir = { tipo: 'produtor', produtor: produtor._id };
  if (
    await Report.exists({
      ...porDecidir,
      autor: req.user.id,
      estado: 'pendente',
    })
  ) {
    throw criarErro(409, 'Já denunciou este produtor');
  }

  const corpo = req.body ?? {};
  const denuncia = new Report({
    ...porDecidir,
    autor: req.user.id,
    motivo: typeof corpo.motivo === 'string' ? corpo.motivo : undefined,
    descricao:
      typeof corpo.descricao === 'string'
        ? corpo.descricao.trim() || undefined
        : undefined,
  });
  // Só a primeira denúncia por decidir chega ao administrador como notificação; as outras só
  // atualizam as listas e os números
  const jaNaLista = await Report.exists({ ...porDecidir, estado: 'pendente' });
  // Um pedido repetido ao mesmo tempo esbarra no índice único e dá 409 (no tratador de erros)
  await denuncia.save();

  await avisarAdministradores(
    req.app.get('io'),
    !jaNaLista && {
      texto: `Nova denúncia de um produtor: ${produtor.produtor.nomeExploracao}.`,
      tipo: 'denuncia',
      ligacao: '/admin/denuncias?tipo=produtor',
    },
    'denuncias-mudaram',
    {},
  );
  res.status(201).json({
    id: denuncia._id,
    motivo: denuncia.motivo,
    descricao: denuncia.descricao,
    estado: denuncia.estado,
    data: denuncia.createdAt,
  });
});

export default router;
