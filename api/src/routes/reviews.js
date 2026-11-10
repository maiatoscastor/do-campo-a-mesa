import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, authOpcional } from '../middleware/auth.js';
import { Order } from '../models/Order.js';
import { Report } from '../models/Report.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { resumoDoProdutor } from '../services/avaliacoes.js';
import { avisar, avisarAdministradores } from '../sockets/avisos.js';
import { criarErro } from '../utils/erro.js';
import { nomeCurto } from '../utils/nomes.js';

const router = Router();

// Quantas avaliações vêm de cada vez na lista de um produtor ("Carregar mais" pede as seguintes)
const POR_PAGINA = 10;

function textoDasEstrelas(estrelas) {
  return estrelas === 1 ? '1 estrela' : `${estrelas} estrelas`;
}

// O que se envia ao cliente. Quem avaliou aparece com o nome curto ("Ana T."), como nos leilões.
// Com "comModeracao", vai também a decisão do administrador (para quem escreveu a avaliação e para o
// produtor avaliado).
function avaliacaoPublica(avaliacao, { comModeracao = false } = {}) {
  const {
    _id,
    autor,
    produtor,
    encomenda,
    classificacao,
    comentario,
    produtos,
    resposta,
    editadaEm,
    createdAt,
    visivel,
    moderacao,
  } = avaliacao.toObject({ versionKey: false });
  return {
    id: _id,
    classificacao,
    comentario,
    produtos,
    resposta,
    autor: autor?.nome
      ? { id: autor._id, nome: nomeCurto(autor.nome) }
      : { id: autor },
    produtor,
    encomenda,
    data: createdAt,
    editadaEm,
    ...(comModeracao && {
      visivel,
      moderacao: moderacao && {
        decisao: moderacao.decisao,
        motivo: moderacao.motivo,
        data: moderacao.data,
      },
    }),
  };
}

// Uma avaliação oculta pelo administrador já não se muda nem se responde
function exigirVisivel(avaliacao) {
  if (!avaliacao.visivel) {
    throw criarErro(409, 'Esta avaliação foi ocultada pelo administrador');
  }
}

// As estrelas e o comentário do pedido, e as estrelas dos produtos, que só podem ser de produtos da
// encomenda. Um produto sem estrelas fica de fora (são opcionais). O nome do produto vem da
// encomenda, e nunca do pedido.
function dadosDaAvaliacao(corpo, encomenda) {
  const produtos = [];
  for (const nota of Array.isArray(corpo.produtos) ? corpo.produtos : []) {
    const { produto, classificacao } = nota ?? {};
    if (classificacao === undefined || classificacao === null) {
      continue;
    }
    const linha = encomenda.linhas.find(
      (l) => l.produto.toString() === produto,
    );
    if (!linha) {
      throw criarErro(400, 'Só pode avaliar os produtos desta encomenda');
    }
    if (
      !Number.isInteger(classificacao) ||
      classificacao < 1 ||
      classificacao > 5
    ) {
      throw criarErro(400, 'As estrelas de cada produto vão de 1 a 5');
    }
    if (!produtos.some((p) => p.produto.equals(linha.produto))) {
      produtos.push({
        produto: linha.produto,
        nome: linha.nome,
        classificacao,
      });
    }
  }
  return {
    classificacao:
      typeof corpo.classificacao === 'number' ? corpo.classificacao : undefined,
    comentario:
      typeof corpo.comentario === 'string'
        ? corpo.comentario.trim() || undefined
        : undefined,
    produtos,
  };
}

// A avaliação tem de existir
async function avaliacaoDoPedido(req) {
  const avaliacao = await Review.findById(req.params.id);
  if (!avaliacao) {
    throw criarErro(404, 'Avaliação não encontrada');
  }
  return avaliacao;
}

// GET /api/reviews?produtor=…&estrelas=…&pagina=…: as avaliações visíveis de um produtor, das mais
// recentes para as mais antigas, aberto a todos. Vem também o resumo (média, total e distribuição),
// que não muda com o filtro das estrelas. Com sessão, cada avaliação diz se a pessoa já a denunciou.
router.get('/', authOpcional, async (req, res) => {
  const { produtor } = req.query;
  if (
    typeof produtor !== 'string' ||
    !mongoose.isObjectIdOrHexString(produtor)
  ) {
    throw criarErro(400, 'Indique o produtor');
  }
  const filtro = { produtor, visivel: true };
  const estrelas = Number(req.query.estrelas);
  if (Number.isInteger(estrelas) && estrelas >= 1 && estrelas <= 5) {
    filtro.classificacao = estrelas;
  }
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);

  const [lista, resumo] = await Promise.all([
    // Pede-se uma a mais só para saber se há mais páginas
    Review.find(filtro)
      .sort({ createdAt: -1 })
      .skip((pagina - 1) * POR_PAGINA)
      .limit(POR_PAGINA + 1)
      .populate('autor', 'nome'),
    resumoDoProdutor(produtor),
  ]);
  const avaliacoes = lista.slice(0, POR_PAGINA);
  const denunciadas = req.user
    ? await Report.find({
        autor: req.user.id,
        avaliacao: { $in: avaliacoes.map(({ _id }) => _id) },
      }).distinct('avaliacao')
    : null;
  res.json({
    resumo,
    avaliacoes: avaliacoes.map((avaliacao) => ({
      ...avaliacaoPublica(avaliacao),
      ...(denunciadas && {
        denunciada: denunciadas.some((id) => id.equals(avaliacao._id)),
      }),
    })),
    temMais: lista.length > POR_PAGINA,
  });
});

// GET /api/reviews/:id: uma avaliação. Uma avaliação oculta só a vêem quem a escreveu, o produtor e
// o administrador.
router.get('/:id', auth(), async (req, res) => {
  const avaliacao = await avaliacaoDoPedido(req);
  const envolvido =
    avaliacao.autor.equals(req.user.id) ||
    avaliacao.produtor.equals(req.user.id) ||
    req.user.papel === 'admin';
  if (!avaliacao.visivel && !envolvido) {
    throw criarErro(404, 'Avaliação não encontrada');
  }
  await avaliacao.populate('autor', 'nome');
  res.json(avaliacaoPublica(avaliacao, { comModeracao: envolvido }));
});

// POST /api/reviews: quem fez a encomenda avalia-a, depois de entregue. Corpo: { encomenda,
// classificacao, comentario, produtos: [{ produto, classificacao }] }. Responde 201 com o endereço da
// avaliação no cabeçalho Location; uma segunda avaliação da mesma encomenda dá 409.
router.post('/', auth(), async (req, res) => {
  const corpo = req.body ?? {};
  if (
    typeof corpo.encomenda !== 'string' ||
    !mongoose.isObjectIdOrHexString(corpo.encomenda)
  ) {
    throw criarErro(400, 'Indique a encomenda');
  }
  const encomenda = await Order.findById(corpo.encomenda);
  if (!encomenda) {
    throw criarErro(404, 'Encomenda não encontrada');
  }
  if (!encomenda.comprador.equals(req.user.id)) {
    throw criarErro(403, 'Só quem fez a encomenda a pode avaliar');
  }
  if (encomenda.estado !== 'entregue') {
    throw criarErro(
      409,
      'Só pode avaliar a encomenda depois de ela ser entregue',
    );
  }
  if (await Review.exists({ encomenda: encomenda._id })) {
    throw criarErro(409, 'Já avaliou esta encomenda');
  }

  const avaliacao = await Review.create({
    autor: req.user.id,
    produtor: encomenda.produtor,
    encomenda: encomenda._id,
    ...dadosDaAvaliacao(corpo, encomenda),
  });
  await avisar(
    req.app.get('io'),
    encomenda.produtor,
    {
      texto: `${req.user.nome} avaliou a encomenda com ${textoDasEstrelas(avaliacao.classificacao)}.`,
      tipo: 'avaliacao',
      ligacao: `/produtores/${encomenda.produtor}/avaliacoes`,
    },
    'nova-avaliacao',
    { id: avaliacao._id },
  );
  await avaliacao.populate('autor', 'nome');
  res
    .status(201)
    .location(`/api/reviews/${avaliacao.id}`)
    .json(avaliacaoPublica(avaliacao));
});

// PUT /api/reviews/:id: quem escreveu a avaliação muda-a (o mesmo corpo do POST, sem a encomenda)
router.put('/:id', auth(), async (req, res) => {
  const avaliacao = await avaliacaoDoPedido(req);
  if (!avaliacao.autor.equals(req.user.id)) {
    throw criarErro(403, 'Esta avaliação não é sua');
  }
  exigirVisivel(avaliacao);
  const encomenda = await Order.findById(avaliacao.encomenda);
  avaliacao.set({
    ...dadosDaAvaliacao(req.body ?? {}, encomenda),
    editadaEm: new Date(),
  });
  await avaliacao.save();
  await avisar(
    req.app.get('io'),
    avaliacao.produtor,
    {
      texto: `${req.user.nome} mudou a avaliação da encomenda para ${textoDasEstrelas(avaliacao.classificacao)}.`,
      tipo: 'avaliacao',
      ligacao: `/produtores/${avaliacao.produtor}/avaliacoes`,
    },
    'nova-avaliacao',
    { id: avaliacao._id },
  );
  await avaliacao.populate('autor', 'nome');
  res.json(avaliacaoPublica(avaliacao));
});

// PUT /api/reviews/:id/resposta: o produtor avaliado responde, ou muda a resposta. Corpo: { texto }.
// Quem avaliou só é avisado da primeira resposta.
router.put('/:id/resposta', auth('produtor'), async (req, res) => {
  const avaliacao = await avaliacaoDoPedido(req);
  if (!avaliacao.produtor.equals(req.user.id)) {
    throw criarErro(403, 'Só o produtor avaliado pode responder');
  }
  exigirVisivel(avaliacao);
  const primeira = !avaliacao.resposta;
  avaliacao.resposta = {
    texto: typeof req.body?.texto === 'string' ? req.body.texto : undefined,
    data: new Date(),
  };
  await avaliacao.save();
  if (primeira) {
    const produtor = await User.findById(req.user.id).select(
      'produtor.nomeExploracao',
    );
    await avisar(
      req.app.get('io'),
      avaliacao.autor,
      {
        texto: `${produtor.produtor.nomeExploracao} respondeu à sua avaliação.`,
        tipo: 'avaliacao',
        ligacao: `/produtores/${avaliacao.produtor}/avaliacoes`,
      },
      'resposta-avaliacao',
      { id: avaliacao._id },
    );
  }
  await avaliacao.populate('autor', 'nome');
  res.json(avaliacaoPublica(avaliacao));
});

// DELETE /api/reviews/:id/resposta: o produtor tira a resposta. Responde 204, sem corpo.
router.delete('/:id/resposta', auth('produtor'), async (req, res) => {
  const avaliacao = await avaliacaoDoPedido(req);
  if (!avaliacao.produtor.equals(req.user.id)) {
    throw criarErro(403, 'Só o produtor avaliado pode tirar a resposta');
  }
  avaliacao.resposta = undefined;
  await avaliacao.save();
  res.status(204).end();
});

// POST /api/reviews/:id/denuncias: quem tem sessão denuncia uma avaliação, uma só vez. Corpo:
// { motivo, descricao } (a descrição é obrigatória no motivo "outro"). A avaliação continua visível
// até o administrador decidir. Responde 201, com a denúncia.
router.post('/:id/denuncias', auth(), async (req, res) => {
  const avaliacao = await avaliacaoDoPedido(req);
  // Uma avaliação oculta já não está à vista de quem a podia denunciar
  if (!avaliacao.visivel) {
    throw criarErro(404, 'Avaliação não encontrada');
  }
  if (avaliacao.autor.equals(req.user.id)) {
    throw criarErro(403, 'Não pode denunciar a sua própria avaliação');
  }
  if (await Report.exists({ avaliacao: avaliacao._id, autor: req.user.id })) {
    throw criarErro(409, 'Já denunciou esta avaliação');
  }

  const corpo = req.body ?? {};
  const denuncia = new Report({
    tipo: 'avaliacao',
    avaliacao: avaliacao._id,
    autor: req.user.id,
    motivo: typeof corpo.motivo === 'string' ? corpo.motivo : undefined,
    descricao:
      typeof corpo.descricao === 'string'
        ? corpo.descricao.trim() || undefined
        : undefined,
  });
  // Só a primeira denúncia por decidir põe a avaliação na lista do administrador: é a única que lhe
  // chega como notificação. As outras só atualizam as listas e os números.
  const jaNaLista = await Report.exists({
    avaliacao: avaliacao._id,
    estado: 'pendente',
  });
  // Um pedido repetido ao mesmo tempo esbarra no índice único e dá 409 (no tratador de erros)
  await denuncia.save();

  const produtor = await User.findById(avaliacao.produtor).select(
    'produtor.nomeExploracao',
  );
  await avisarAdministradores(
    req.app.get('io'),
    !jaNaLista && {
      texto: `Nova denúncia de uma avaliação a ${produtor.produtor.nomeExploracao}.`,
      tipo: 'denuncia',
      ligacao: '/admin/denuncias',
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
