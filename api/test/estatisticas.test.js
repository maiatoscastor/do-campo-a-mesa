import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Auction } from '../src/models/Auction.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { Review } from '../src/models/Review.js';
import { User } from '../src/models/User.js';

const PASSWORD = 'uma-password-de-teste';
const DIA = 24 * 60 * 60 * 1000;

let servidor;
let base;

// Base de dados à parte, como nos outros testes (os ficheiros de teste correm um de cada vez)
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  await Promise.all(
    [User, Product, Order, Review, Auction, Notification].map((modelo) =>
      modelo.init(),
    ),
  );
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Auction, Review, Notification, Order, Product, User].map((modelo) =>
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
  return { estado: resposta.status, dados: texto ? JSON.parse(texto) : null };
}

async function criarConta(nome, { papel = 'comprador' } = {}) {
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

async function criarProduto(token, nome, preco) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Fruta', preco, unidade: 'kg', stock: 100 },
  });
  return dados.id;
}

// Uma encomenda de um produto, feita há "dias" dias (o createdAt do Mongoose não se muda pela API:
// escreve-se diretamente na coleção)
async function encomenda(comprador, produto, quantidade, dias = 0) {
  const { dados } = await pedir('POST', '/orders', {
    token: comprador.token,
    corpo: { linhas: [{ produto, quantidade }], modo: 'levantamento' },
  });
  const id = dados[0].id;
  if (dias > 0) {
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(String(id)) },
      { $set: { createdAt: new Date(Date.now() - dias * DIA) } },
    );
  }
  return id;
}

describe('estatísticas do produtor', () => {
  it('são só para produtores, e o período tem de ser um dos da lista', async () => {
    const ana = await criarConta('Ana Teixeira');
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });

    const semSessao = await pedir('GET', '/producers/eu/estatisticas');
    const comprador = await pedir('GET', '/producers/eu/estatisticas', {
      token: ana.token,
    });
    const periodoErrado = await pedir(
      'GET',
      '/producers/eu/estatisticas?periodo=12',
      {
        token: abel.token,
      },
    );
    const semNada = await pedir('GET', '/producers/eu/estatisticas', {
      token: abel.token,
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(comprador.estado, 403);
    assert.equal(periodoErrado.estado, 400);
    assert.equal(semNada.estado, 200);
    assert.deepEqual(semNada.dados.vendas, {
      valor: 0,
      encomendas: 0,
      valorMedio: 0,
    });
    // 30 barras, uma por dia, todas a zero
    assert.equal(semNada.dados.serie.length, 30);
    assert.ok(semNada.dados.serie.every(({ valor }) => valor === 0));
  });

  it('contam as vendas do período, sem as canceladas, e o período anterior para comparar', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const rosa = await criarConta('Horta da Rosa', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    const kiwi = await criarProduto(abel.token, 'Kiwi', 2.5);
    const mel = await criarProduto(abel.token, 'Mel', 8);
    const grelos = await criarProduto(rosa.token, 'Grelos', 1.8);

    await encomenda(ana, kiwi, 4); // 10 € hoje
    await encomenda(ana, mel, 1, 10); // 8 € há 10 dias
    await encomenda(ana, kiwi, 2, 40); // 5 € há 40 dias: o período anterior
    await encomenda(ana, grelos, 3); // de outro produtor: não conta
    const cancelada = await encomenda(ana, mel, 5); // 40 €, cancelada: não conta
    await Order.updateOne({ _id: cancelada }, { estado: 'cancelada' });
    // Um leilão vendido por 60 € e outro sem licitações, os dois acabados há 2 dias
    const fimHa2Dias = new Date(Date.now() - 2 * DIA);
    await Auction.collection.insertMany([
      {
        produtor: new mongoose.Types.ObjectId(abel.id),
        estado: 'terminado',
        terminaEm: fimHa2Dias,
        numeroDeLicitacoes: 3,
        licitacaoAtual: { valor: 60 },
      },
      {
        produtor: new mongoose.Types.ObjectId(abel.id),
        estado: 'terminado',
        terminaEm: fimHa2Dias,
        numeroDeLicitacoes: 0,
        licitacaoAtual: { valor: 20 },
      },
    ]);

    const { estado, dados } = await pedir(
      'GET',
      '/producers/eu/estatisticas?periodo=30',
      {
        token: abel.token,
      },
    );

    assert.equal(estado, 200);
    assert.deepEqual(dados.vendas, { valor: 18, encomendas: 2, valorMedio: 9 });
    assert.deepEqual(dados.anterior, {
      valor: 5,
      encomendas: 1,
      valorMedio: 5,
    });
    // A soma das barras é o total do período, e a última barra é hoje
    assert.equal(dados.serie.length, 30);
    assert.equal(
      dados.serie.reduce((soma, { valor }) => soma + valor, 0),
      18,
    );
    assert.equal(dados.serie.at(-1).valor, 10);
    assert.deepEqual(
      dados.produtos.map(({ nome, quantidade, valor }) => [
        nome,
        quantidade,
        valor,
      ]),
      [
        ['Kiwi', 4, 10],
        ['Mel', 1, 8],
      ],
    );
    assert.deepEqual(dados.estados, { pendente: 2, cancelada: 1 });
    assert.deepEqual(dados.leiloes, { terminados: 2, vendidos: 1, valor: 60 });

    // Em 90 dias, por semana, e com a encomenda de há 40 dias
    const noventa = await pedir(
      'GET',
      '/producers/eu/estatisticas?periodo=90',
      {
        token: abel.token,
      },
    );
    assert.equal(noventa.dados.periodo.agrupamento, 'semana');
    assert.equal(noventa.dados.vendas.valor, 23);
    assert.ok(
      noventa.dados.serie.length >= 13 && noventa.dados.serie.length <= 14,
    );
  });
});
