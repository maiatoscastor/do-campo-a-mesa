import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { User } from '../src/models/User.js';

const PASSWORD = 'uma-password-de-teste';

let servidor;
let base;

// Base de dados à parte, como nos outros testes (os ficheiros de teste correm um de cada vez)
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  // As coleções (e o índice único das avaliações) têm de existir antes dos testes
  await Promise.all(
    [User, Product, Order, Review, Notification].map((modelo) => modelo.init()),
  );
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Review, Notification, Order, Product, User].map((modelo) =>
      modelo.deleteMany({}),
    ),
  );
}

beforeEach(limpar);

after(async () => {
  await limpar();
  servidor.close();
  if (mongoose.connection.name.endsWith('-teste')) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
});

async function pedir(metodo, caminho, { corpo, token } = {}) {
  const resposta = await fetch(`${base}/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return {
    estado: resposta.status,
    dados: texto ? JSON.parse(texto) : null,
    cabecalhos: resposta.headers,
  };
}

// Regista uma conta pela API; os produtores ficam aprovados
async function criarConta(nome, { papel = 'produtor' } = {}) {
  const email = `${nome.toLowerCase().replaceAll(' ', '.')}@teste.pt`;
  const { dados } = await pedir('POST', '/auth/registo', {
    corpo: {
      nome,
      email,
      password: PASSWORD,
      papel,
      ...(papel === 'produtor'
        ? { nomeExploracao: nome, concelho: '1607', freguesia: '160704' }
        : {}),
    },
  });
  if (papel === 'produtor') {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

async function criarProduto(token, nome) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Outros', preco: 2, unidade: 'kg', stock: 50 },
  });
  return dados.id;
}

// Uma encomenda dos produtos indicados, levada até ao estado pedido (por omissão, entregue)
async function encomendar(comprador, produtor, produtos, ate = 'entregue') {
  const { dados } = await pedir('POST', '/orders', {
    token: comprador.token,
    corpo: {
      linhas: produtos.map((produto) => ({ produto, quantidade: 1 })),
      modo: 'levantamento',
    },
  });
  const [encomenda] = dados;
  for (const estado of ['confirmada', 'pronta', 'entregue']) {
    if (encomenda.estado === ate) {
      break;
    }
    const { dados: mudada } = await pedir(
      'PATCH',
      `/orders/${encomenda.id}/estado`,
      { token: produtor.token, corpo: { estado } },
    );
    encomenda.estado = mudada.estado;
  }
  return encomenda.id;
}

// Um produtor com dois produtos, e uma compradora
async function cenario() {
  const abel = await criarConta('Quinta do Abel');
  const ana = await criarConta('Ana Maria Teixeira', { papel: 'comprador' });
  const kiwi = await criarProduto(abel.token, 'Kiwi');
  const mel = await criarProduto(abel.token, 'Mel');
  return { abel, ana, kiwi, mel };
}

describe('avaliar uma encomenda', () => {
  it('só quem fez a encomenda a avalia, e só depois de entregue', async () => {
    const { abel, ana, kiwi } = await cenario();
    const rui = await criarConta('Rui', { papel: 'comprador' });
    const porEntregar = await encomendar(ana, abel, [kiwi], 'pronta');
    const entregue = await encomendar(ana, abel, [kiwi]);
    const avaliar = (token, encomenda) =>
      pedir('POST', '/reviews', {
        token,
        corpo: { encomenda, classificacao: 5 },
      });

    const antesDeEntregue = await avaliar(ana.token, porEntregar);
    const deOutro = await avaliar(rui.token, entregue);
    const semEncomenda = await avaliar(ana.token, undefined);
    const inexistente = await avaliar(ana.token, '0123456789abcdef01234567');
    const semSessao = await pedir('POST', '/reviews', {
      corpo: { encomenda: entregue, classificacao: 5 },
    });

    assert.equal(antesDeEntregue.estado, 409);
    assert.equal(deOutro.estado, 403);
    assert.equal(semEncomenda.estado, 400);
    assert.equal(inexistente.estado, 404);
    assert.equal(semSessao.estado, 401);
    assert.equal(await Review.countDocuments(), 0);
  });

  it('avalia uma vez, o produtor é avisado, e a segunda avaliação dá 409', async () => {
    const { abel, ana, kiwi, mel } = await cenario();
    const encomenda = await encomendar(ana, abel, [kiwi, mel]);

    const primeira = await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: {
        encomenda,
        classificacao: 4,
        comentario: '  Kiwis muito doces.  ',
        produtos: [
          { produto: kiwi, classificacao: 5 },
          { produto: mel, classificacao: null },
        ],
      },
    });
    const segunda = await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda, classificacao: 1 },
    });
    const aviso = await Notification.findOne({ utilizador: abel.id });

    assert.equal(primeira.estado, 201);
    assert.equal(
      primeira.cabecalhos.get('location'),
      `/api/reviews/${primeira.dados.id}`,
    );
    assert.equal(primeira.dados.comentario, 'Kiwis muito doces.');
    assert.equal(primeira.dados.autor.nome, 'Ana T.');
    // O mel ficou sem estrelas: não entra
    assert.deepEqual(primeira.dados.produtos, [
      { produto: kiwi, nome: 'Kiwi', classificacao: 5 },
    ]);
    assert.equal(segunda.estado, 409);
    assert.equal(segunda.dados.erro, 'Já avaliou esta encomenda');
    assert.equal(aviso.tipo, 'avaliacao');
    assert.equal(
      aviso.texto,
      'Ana Maria Teixeira avaliou a encomenda com 4 estrelas.',
    );
    assert.equal(aviso.ligacao, `/produtores/${abel.id}/avaliacoes`);
  });

  it('duas avaliações da mesma encomenda ao mesmo tempo: só uma é aceite', async () => {
    const { abel, ana, kiwi } = await cenario();
    const encomenda = await encomendar(ana, abel, [kiwi]);

    const respostas = await Promise.all(
      [5, 3].map((classificacao) =>
        pedir('POST', '/reviews', {
          token: ana.token,
          corpo: { encomenda, classificacao },
        }),
      ),
    );

    assert.deepEqual(respostas.map(({ estado }) => estado).sort(), [201, 409]);
    assert.equal(await Review.countDocuments(), 1);
  });

  it('valida as estrelas, o comentário e os produtos', async () => {
    const { abel, ana, kiwi } = await cenario();
    const outro = await criarProduto(abel.token, 'Couve');
    const encomenda = await encomendar(ana, abel, [kiwi]);
    const avaliar = (corpo) =>
      pedir('POST', '/reviews', {
        token: ana.token,
        corpo: { encomenda, ...corpo },
      });

    const semEstrelas = await avaliar({ comentario: 'Bom' });
    const seis = await avaliar({ classificacao: 6 });
    const meia = await avaliar({ classificacao: 3.5 });
    const comprido = await avaliar({
      classificacao: 4,
      comentario: 'a'.repeat(1001),
    });
    const produtoDeFora = await avaliar({
      classificacao: 4,
      produtos: [{ produto: outro, classificacao: 5 }],
    });
    const produtoComZero = await avaliar({
      classificacao: 4,
      produtos: [{ produto: kiwi, classificacao: 0 }],
    });

    assert.equal(semEstrelas.estado, 400);
    assert.equal(
      semEstrelas.dados.detalhes.classificacao,
      'Escolha de 1 a 5 estrelas',
    );
    assert.equal(seis.estado, 400);
    assert.equal(meia.estado, 400);
    assert.equal(comprido.dados.detalhes.comentario.includes('comprido'), true);
    assert.equal(produtoDeFora.estado, 400);
    assert.equal(produtoComZero.estado, 400);
    assert.equal(await Review.countDocuments(), 0);
  });
});

describe('médias e lista das avaliações', () => {
  it('o resumo, a lista, as médias dos produtos e a nota na página contam só as visíveis', async () => {
    const { abel, ana, kiwi, mel } = await cenario();
    const rui = await criarConta('Rui', { papel: 'comprador' });
    const ze = await criarConta('Ze', { papel: 'comprador' });
    const daAna = await encomendar(ana, abel, [kiwi, mel]);
    const doRui = await encomendar(rui, abel, [kiwi]);
    const doZe = await encomendar(ze, abel, [kiwi]);
    for (const [token, encomenda, classificacao, produtos] of [
      [ana.token, daAna, 5, [{ produto: kiwi, classificacao: 5 }]],
      [rui.token, doRui, 4, [{ produto: kiwi, classificacao: 4 }]],
      [ze.token, doZe, 1, [{ produto: kiwi, classificacao: 1 }]],
    ]) {
      await pedir('POST', '/reviews', {
        token,
        corpo: { encomenda, classificacao, produtos },
      });
    }
    // O administrador ocultou a do Zé
    await Review.updateOne({ encomenda: doZe }, { visivel: false });

    const lista = await pedir('GET', `/reviews?produtor=${abel.id}`);
    const soCinco = await pedir(
      'GET',
      `/reviews?produtor=${abel.id}&estrelas=5`,
    );
    const produtos = await pedir('GET', '/products');
    const pagina = await pedir('GET', `/producers/${abel.id}`);
    const semProdutor = await pedir('GET', '/reviews');

    assert.deepEqual(lista.dados.resumo, {
      media: 4.5,
      total: 2,
      distribuicao: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    });
    // Das mais recentes para as mais antigas
    assert.deepEqual(
      lista.dados.avaliacoes.map(({ autor }) => autor.nome),
      ['Rui', 'Ana T.'],
    );
    assert.equal(lista.dados.temMais, false);
    assert.deepEqual(
      soCinco.dados.avaliacoes.map(({ classificacao }) => classificacao),
      [5],
    );
    // O resumo não muda com o filtro
    assert.equal(soCinco.dados.resumo.total, 2);
    const doKiwi = produtos.dados.find(({ id }) => id === kiwi);
    const doMel = produtos.dados.find(({ id }) => id === mel);
    assert.deepEqual(doKiwi.avaliacao, { media: 4.5, total: 2 });
    assert.equal(doMel.avaliacao, undefined);
    assert.deepEqual(pagina.dados.avaliacao, lista.dados.resumo);
    assert.equal(semProdutor.estado, 400);
  });

  it('sem avaliações, a média fica vazia', async () => {
    const { abel } = await cenario();

    const pagina = await pedir('GET', `/producers/${abel.id}`);

    assert.deepEqual(pagina.dados.avaliacao, {
      media: null,
      total: 0,
      distribuicao: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('as encomendas dizem se já foram avaliadas, e só os envolvidos as vêem', async () => {
    const { abel, ana, kiwi } = await cenario();
    const rui = await criarConta('Rui', { papel: 'comprador' });
    const encomenda = await encomendar(ana, abel, [kiwi]);
    const { dados: avaliacao } = await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda, classificacao: 3 },
    });

    const daAna = await pedir('GET', '/orders', { token: ana.token });
    const recebidas = await pedir('GET', '/orders/recebidas', {
      token: abel.token,
    });
    const umaDaAna = await pedir('GET', `/orders/${encomenda}`, {
      token: ana.token,
    });
    const umaDoAbel = await pedir('GET', `/orders/${encomenda}`, {
      token: abel.token,
    });
    const umaDoRui = await pedir('GET', `/orders/${encomenda}`, {
      token: rui.token,
    });

    const esperada = { id: avaliacao.id, classificacao: 3, visivel: true };
    assert.deepEqual(daAna.dados[0].avaliacao, esperada);
    assert.deepEqual(recebidas.dados[0].avaliacao, esperada);
    assert.deepEqual(umaDaAna.dados.avaliacao, esperada);
    assert.equal(umaDoAbel.estado, 200);
    assert.equal(umaDoRui.estado, 403);
  });
});

describe('mudar uma avaliação e responder', () => {
  it('só o autor muda a avaliação, e o produtor é avisado', async () => {
    const { abel, ana, kiwi } = await cenario();
    const rui = await criarConta('Rui', { papel: 'comprador' });
    const encomenda = await encomendar(ana, abel, [kiwi]);
    const { dados: avaliacao } = await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda, classificacao: 5, comentario: 'Ótimo' },
    });

    const doRui = await pedir('PUT', `/reviews/${avaliacao.id}`, {
      token: rui.token,
      corpo: { classificacao: 1 },
    });
    const daAna = await pedir('PUT', `/reviews/${avaliacao.id}`, {
      token: ana.token,
      corpo: { classificacao: 2, comentario: '' },
    });
    const avisos = await Notification.find({ utilizador: abel.id }).sort({
      _id: 1,
    });

    assert.equal(doRui.estado, 403);
    assert.equal(daAna.estado, 200);
    assert.equal(daAna.dados.classificacao, 2);
    // Um comentário vazio tira o que lá estava
    assert.equal(daAna.dados.comentario, undefined);
    assert.ok(daAna.dados.editadaEm);
    assert.equal(
      avisos.at(-1).texto,
      'Ana Maria Teixeira mudou a avaliação da encomenda para 2 estrelas.',
    );
  });

  it('só o produtor avaliado responde, e quem avaliou é avisado da primeira resposta', async () => {
    const { abel, ana, kiwi } = await cenario();
    const graca = await criarConta('Horta da Graca');
    const encomenda = await encomendar(ana, abel, [kiwi]);
    const { dados: avaliacao } = await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda, classificacao: 4 },
    });
    const responder = (token, texto) =>
      pedir('PUT', `/reviews/${avaliacao.id}/resposta`, {
        token,
        corpo: { texto },
      });

    const daCompradora = await responder(ana.token, 'Olá');
    const deOutroProdutor = await responder(graca.token, 'Olá');
    const vazia = await responder(abel.token, '   ');
    const primeira = await responder(abel.token, 'Obrigado, Ana!');
    const mudada = await responder(abel.token, 'Obrigado pela visita!');
    const avisosDaAna = await Notification.find({ utilizador: ana.id });
    const tirada = await pedir('DELETE', `/reviews/${avaliacao.id}/resposta`, {
      token: abel.token,
    });
    const depois = await pedir('GET', `/reviews?produtor=${abel.id}`);

    assert.equal(daCompradora.estado, 403);
    assert.equal(deOutroProdutor.estado, 403);
    assert.equal(vazia.estado, 400);
    assert.equal(vazia.dados.detalhes.texto, 'Escreva a resposta');
    assert.equal(primeira.estado, 200);
    assert.equal(primeira.dados.resposta.texto, 'Obrigado, Ana!');
    assert.equal(mudada.dados.resposta.texto, 'Obrigado pela visita!');
    // A Ana tem os avisos da encomenda e um só da resposta
    const daResposta = avisosDaAna.filter(({ tipo }) => tipo === 'avaliacao');
    assert.equal(daResposta.length, 1);
    assert.equal(
      daResposta[0].texto,
      'Quinta do Abel respondeu à sua avaliação.',
    );
    assert.equal(tirada.estado, 204);
    assert.equal(depois.dados.avaliacoes[0].resposta, undefined);
  });

  it('o aviso de entregue leva ao formulário da avaliação', async () => {
    const { abel, ana, kiwi } = await cenario();
    const encomenda = await encomendar(ana, abel, [kiwi]);

    const aviso = await Notification.findOne({ utilizador: ana.id }).sort({
      _id: -1,
    });

    assert.equal(aviso.ligacao, `/encomendas/${encomenda}/avaliar`);
    assert.equal(
      aviso.texto,
      'Quinta do Abel marcou a sua encomenda como entregue. Já a pode avaliar.',
    );
  });
});
