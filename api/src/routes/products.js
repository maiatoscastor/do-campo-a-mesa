import { Router } from 'express';
import mongoose from 'mongoose';
import { auth, produtorAprovado } from '../middleware/auth.js';
import { CATEGORIAS, EPOCAS, Product } from '../models/Product.js';
import { castigoAtivo, produtoresAVender, User } from '../models/User.js';
import { mediasDosProdutos } from '../services/avaliacoes.js';
import { criarErro } from '../utils/erro.js';
import {
  apagarImagem,
  guardarImagem,
  receberImagem,
} from '../utils/imagens.js';
import { expressao } from '../utils/pesquisa.js';

const router = Router();

// Os dados do produtor que acompanham cada produto
const CAMPOS_DO_PRODUTOR = 'nome produtor.nomeExploracao produtor.localizacao';

// O que se envia ao cliente: o produto, com o produtor reduzido ao que interessa ao catálogo.
// Quando o produtor não foi carregado (populate), fica só o identificador dele.
function produtoPublico(produto) {
  const { _id, produtor, ...resto } = produto.toObject({ versionKey: false });
  return {
    id: _id,
    ...resto,
    produtor: produtor?.produtor
      ? {
          id: produtor._id,
          nomeExploracao: produtor.produtor?.nomeExploracao,
          localizacao: produtor.produtor?.localizacao,
        }
      : produtor,
  };
}

// Os produtos prontos a enviar, cada um com a média das estrelas que recebeu nas avaliações das
// encomendas ({ media, total }), quando já tem alguma
async function comAvaliacoes(produtos) {
  const medias = await mediasDosProdutos(produtos.map(({ _id }) => _id));
  return produtos.map((produto) => ({
    ...produtoPublico(produto),
    avaliacao: medias.get(produto.id),
  }));
}

// Aceita só os campos que o produtor pode mudar, cada um com o tipo certo. O produtor, a imagem e o
// "exemplo" nunca vêm do pedido.
function dadosDoProduto(corpo = {}) {
  const texto = (valor) => (typeof valor === 'string' ? valor : undefined);
  const numero = (valor) => (typeof valor === 'number' ? valor : undefined);
  return {
    nome: texto(corpo.nome),
    descricao: texto(corpo.descricao),
    categoria: texto(corpo.categoria),
    preco: numero(corpo.preco),
    unidade: texto(corpo.unidade),
    stock: numero(corpo.stock),
    biologico: corpo.biologico === true,
    epocas: Array.isArray(corpo.epocas)
      ? corpo.epocas.filter((epoca) => EPOCAS.includes(epoca))
      : [],
  };
}

// O produto tem de existir e de ser de quem faz o pedido
async function produtoDoProdutor(req) {
  const produto = await Product.findById(req.params.id);
  if (!produto) {
    throw criarErro(404, 'Produto não encontrado');
  }
  if (!produto.produtor.equals(req.user.id)) {
    throw criarErro(403, 'Este produto não é seu');
  }
  return produto;
}

// GET /api/products: o catálogo, aberto a todos. Só mostra produtos de produtores a vender (aprovados
// e sem castigo em vigor).
// Filtros: q (nome, descrição ou produtor), categoria, concelho, produtor, epoca, biologico,
// precoMin, precoMax e ids (só estes produtos, separados por vírgulas: o carrinho usa-o para ter o
// preço e o stock atuais).
router.get('/', async (req, res) => {
  const { q, categoria, concelho, produtor, epoca, biologico, ids } = req.query;
  const precoMin = Number.parseFloat(req.query.precoMin);
  const precoMax = Number.parseFloat(req.query.precoMax);

  const filtroProdutores = produtoresAVender();
  if (typeof concelho === 'string') {
    filtroProdutores['produtor.localizacao.concelho'] = concelho;
  }
  if (typeof produtor === 'string') {
    filtroProdutores._id = produtor;
  }
  const produtores = await User.find(filtroProdutores).distinct('_id');

  const condicoes = [{ produtor: { $in: produtores } }];
  if (typeof ids === 'string') {
    const lista = ids.split(',').filter(mongoose.isObjectIdOrHexString);
    condicoes.push({ _id: { $in: lista } });
  }
  if (typeof categoria === 'string' && CATEGORIAS.includes(categoria)) {
    condicoes.push({ categoria });
  }
  // Um produto sem épocas existe todo o ano, por isso também aparece
  if (typeof epoca === 'string' && EPOCAS.includes(epoca)) {
    condicoes.push({ $or: [{ epocas: epoca }, { epocas: { $size: 0 } }] });
  }
  if (biologico === 'true') {
    condicoes.push({ biologico: true });
  }
  if (Number.isFinite(precoMin)) {
    condicoes.push({ preco: { $gte: precoMin } });
  }
  if (Number.isFinite(precoMax)) {
    condicoes.push({ preco: { $lte: precoMax } });
  }
  if (typeof q === 'string' && q.trim()) {
    const procura = expressao(q.trim());
    const porNome = await User.find({
      _id: { $in: produtores },
      $or: [{ nome: procura }, { 'produtor.nomeExploracao': procura }],
    }).distinct('_id');
    condicoes.push({
      $or: [
        { nome: procura },
        { descricao: procura },
        { produtor: { $in: porNome } },
      ],
    });
  }

  const produtos = await Product.find({ $and: condicoes })
    .sort({ nome: 1 })
    .limit(200)
    .populate('produtor', CAMPOS_DO_PRODUTOR);
  res.json(await comAvaliacoes(produtos));
});

// GET /api/products/meus: os produtos do produtor com sessão, mesmo antes de ser aprovado
router.get('/meus', auth('produtor'), async (req, res) => {
  const produtos = await Product.find({ produtor: req.user.id }).sort({
    nome: 1,
  });
  res.json(await comAvaliacoes(produtos));
});

// GET /api/products/:id: um produto, se o produtor estiver a vender (aprovado e sem castigo)
router.get('/:id', async (req, res) => {
  const produto = await Product.findById(req.params.id).populate(
    'produtor',
    `${CAMPOS_DO_PRODUTOR} produtor.validacao castigo`,
  );
  if (
    produto?.produtor?.produtor?.validacao !== 'aprovado' ||
    castigoAtivo(produto.produtor)
  ) {
    throw criarErro(404, 'Produto não encontrado');
  }
  const [publico] = await comAvaliacoes([produto]);
  res.json(publico);
});

// POST /api/products: um produtor aprovado cria um produto. Responde 201, com o endereço do novo
// produto no cabeçalho Location.
router.post('/', auth('produtor'), produtorAprovado, async (req, res) => {
  const produto = await Product.create({
    ...dadosDoProduto(req.body),
    produtor: req.user.id,
  });
  res
    .status(201)
    .location(`/api/products/${produto.id}`)
    .json(produtoPublico(produto));
});

// PUT /api/products/:id: substitui os dados do produto (todos os campos, como num formulário)
router.put('/:id', auth('produtor'), produtorAprovado, async (req, res) => {
  const produto = await produtoDoProdutor(req);
  produto.set(dadosDoProduto(req.body));
  await produto.save();
  res.json(produtoPublico(produto));
});

// DELETE /api/products/:id: apaga o produto e a fotografia. Responde 204, sem corpo.
router.delete('/:id', auth('produtor'), async (req, res) => {
  const produto = await produtoDoProdutor(req);
  await produto.deleteOne();
  await apagarImagem(produto.imagemUrl);
  res.status(204).end();
});

// PUT /api/products/:id/imagem: põe ou troca a fotografia (formulário com o campo "imagem")
router.put(
  '/:id/imagem',
  auth('produtor'),
  produtorAprovado,
  receberImagem,
  async (req, res) => {
    const produto = await produtoDoProdutor(req);
    const anterior = produto.imagemUrl;
    produto.imagemUrl = await guardarImagem(req.file);
    await produto.save();
    await apagarImagem(anterior);
    res.json(produtoPublico(produto));
  },
);

// DELETE /api/products/:id/imagem: tira a fotografia; o produto volta a mostrar a ilustração
router.delete('/:id/imagem', auth('produtor'), async (req, res) => {
  const produto = await produtoDoProdutor(req);
  await apagarImagem(produto.imagemUrl);
  produto.imagemUrl = undefined;
  await produto.save();
  res.json(produtoPublico(produto));
});

export default router;
