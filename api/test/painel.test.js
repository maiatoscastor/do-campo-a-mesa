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

// Regista uma conta pela API; os produtores ficam aprovados, a não ser que se peça o contrário
async function criarConta(nome, { papel = 'comprador', aprovado = true } = {}) {
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
  if (papel === 'produtor' && aprovado) {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

async function criarProduto(token, nome, preco = 2) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Fruta', preco, unidade: 'kg', stock: 50 },
  });
  return dados.id;
}

async function encomendar(comprador, produto, quantidade = 1) {
  const { dados } = await pedir('POST', '/orders', {
    token: comprador.token,
    corpo: { linhas: [{ produto, quantidade }], modo: 'levantamento' },
  });
  return dados[0].id;
}

describe('lista dos produtores', () => {
  it('traz quantos produtos tem cada um e a média das avaliações', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const rosa = await criarConta('Horta da Rosa', { papel: 'produtor' });
    await criarConta('Quinta Por Validar', {
      papel: 'produtor',
      aprovado: false,
    });
    const ana = await criarConta('Ana Teixeira');
    const kiwi = await criarProduto(abel.token, 'Kiwi');
    await criarProduto(abel.token, 'Mel');
    const encomenda = await encomendar(ana, kiwi);
    for (const estado of ['confirmada', 'pronta', 'entregue']) {
      await pedir('PATCH', `/orders/${encomenda}/estado`, {
        token: abel.token,
        corpo: { estado },
      });
    }
    await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda, classificacao: 4 },
    });

    const todos = await pedir('GET', '/producers');
    const comProdutos = await pedir('GET', '/producers?comProdutos=true');

    const resumo = ({ dados }) =>
      dados.map(({ nomeExploracao, produtos, avaliacao }) => [
        nomeExploracao,
        produtos,
        avaliacao,
      ]);
    // O que está por validar não aparece; a Rosa não tem produtos nem avaliações
    assert.deepEqual(resumo(todos), [
      ['Horta da Rosa', 0, undefined],
      ['Quinta do Abel', 2, { media: 4, total: 1 }],
    ]);
    assert.deepEqual(
      comProdutos.dados.map(({ id }) => id),
      [abel.id],
    );
    assert.equal(rosa.id, todos.dados[0].id);
  });
});
