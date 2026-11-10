import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import {
  mediasDosProdutores,
  resumoDoProdutor,
} from '../services/avaliacoes.js';
import { criarErro, problemasDe } from '../utils/erro.js';
import {
  apagarImagem,
  guardarImagem,
  receberImagem,
} from '../utils/imagens.js';

const router = Router();

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

// GET /api/producers: os produtores aprovados, abertos a todos, com o logótipo, quantos produtos têm
// e a média das avaliações (para os cartões). Com ?comProdutos=true, só os que têm produtos: é o que
// usam os filtros do catálogo, para nenhum filtro dar zero resultados.
router.get('/', async (req, res) => {
  const [produtos, produtores] = await Promise.all([
    Product.aggregate([{ $group: { _id: '$produtor', quantos: { $sum: 1 } } }]),
    User.find({ papel: 'produtor', 'produtor.validacao': 'aprovado' })
      .select(
        'produtor.nomeExploracao produtor.localizacao produtor.logotipoUrl exemplo',
      )
      .sort({ 'produtor.nomeExploracao': 1 }),
  ]);
  const quantos = new Map(
    produtos.map(({ _id, quantos: n }) => [String(_id), n]),
  );
  const lista =
    req.query.comProdutos === 'true'
      ? produtores.filter(({ id }) => quantos.has(id))
      : produtores;
  const medias = await mediasDosProdutores(lista.map(({ _id }) => _id));

  res.json(
    lista.map(({ id, produtor, exemplo }) => ({
      id,
      nomeExploracao: produtor.nomeExploracao,
      localizacao: produtor.localizacao,
      logotipoUrl: produtor.logotipoUrl,
      produtos: quantos.get(id) ?? 0,
      avaliacao: medias.get(id),
      exemplo,
    })),
  );
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

// GET /api/producers/:id: a página pública de um produtor aprovado
router.get('/:id', async (req, res) => {
  const utilizador = await User.findOne({
    _id: req.params.id,
    papel: 'produtor',
    'produtor.validacao': 'aprovado',
  });
  if (!utilizador) {
    throw criarErro(404, 'Produtor não encontrado');
  }
  res.json({
    ...paginaDoProdutor(utilizador),
    avaliacao: await resumoDoProdutor(utilizador._id),
  });
});

export default router;
