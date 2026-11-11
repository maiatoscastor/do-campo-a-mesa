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
import { cifrarPassword } from '../src/utils/password.js';

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

// Regista uma conta pela API; os produtores ficam aprovados, a não ser que se peça o contrário.
// "concelho" e "freguesia" são códigos oficiais (por omissão, Ponte de Lima).
async function criarConta(
  nome,
  {
    papel = 'comprador',
    aprovado = true,
    concelho = '1607',
    freguesia = '160704',
  } = {},
) {
  const email = `${nome.toLowerCase().replaceAll(' ', '.')}@teste.pt`;
  const { dados } = await pedir('POST', '/auth/registo', {
    corpo: {
      nome,
      email,
      password: PASSWORD,
      papel,
      ...(papel === 'produtor'
        ? { nomeExploracao: nome, concelho, freguesia }
        : {}),
    },
  });
  if (papel === 'produtor' && aprovado) {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

async function criarAdmin() {
  await User.create({
    nome: 'Administrador de Teste',
    email: 'admin@teste.pt',
    passwordHash: await cifrarPassword(PASSWORD),
    papel: 'admin',
  });
  const { dados } = await pedir('POST', '/auth/login', {
    corpo: { email: 'admin@teste.pt', password: PASSWORD },
  });
  return dados.token;
}

async function criarProduto(token, nome) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Fruta', preco: 2, unidade: 'kg', stock: 50 },
  });
  return dados.id;
}

// Uma encomenda feita e levada até "entregue"; devolve o identificador
async function entregue(comprador, produtor, produto) {
  const { dados } = await pedir('POST', '/orders', {
    token: comprador.token,
    corpo: { linhas: [{ produto, quantidade: 1 }], modo: 'levantamento' },
  });
  const encomenda = dados[0].id;
  for (const estado of ['confirmada', 'pronta', 'entregue']) {
    await pedir('PATCH', `/orders/${encomenda}/estado`, {
      token: produtor.token,
      corpo: { estado },
    });
  }
  return encomenda;
}

const nomes = ({ dados }) => dados.map(({ nomeExploracao }) => nomeExploracao);

describe('favoritos', () => {
  it('pede sessão, e o administrador não tem favoritos', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const admin = await criarAdmin();

    const semSessao = await pedir('PUT', `/producers/${abel.id}/favorito`);
    const doAdmin = await pedir('PUT', `/producers/${abel.id}/favorito`, {
      token: admin,
    });
    const listaSemSessao = await pedir('GET', '/producers?favoritos=true');

    assert.equal(semSessao.estado, 401);
    assert.equal(doAdmin.estado, 403);
    assert.equal(listaSemSessao.estado, 401);
  });

  it('põe e tira um produtor dos favoritos, e repetir não estraga nada', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    await criarConta('Horta da Rosa', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');

    const primeiro = await pedir('PUT', `/producers/${abel.id}/favorito`, {
      token: ana.token,
    });
    const segundo = await pedir('PUT', `/producers/${abel.id}/favorito`, {
      token: ana.token,
    });
    const favoritos = await pedir('GET', '/producers?favoritos=true', {
      token: ana.token,
    });
    const guardados = await User.findById(ana.id).select('favoritos');

    assert.equal(primeiro.estado, 204);
    assert.equal(segundo.estado, 204);
    assert.deepEqual(nomes(favoritos), ['Quinta do Abel']);
    assert.equal(guardados.favoritos.length, 1);

    const tirado = await pedir('DELETE', `/producers/${abel.id}/favorito`, {
      token: ana.token,
    });
    const outraVez = await pedir('DELETE', `/producers/${abel.id}/favorito`, {
      token: ana.token,
    });
    const depois = await pedir('GET', '/producers?favoritos=true', {
      token: ana.token,
    });

    assert.equal(tirado.estado, 204);
    assert.equal(outraVez.estado, 204);
    assert.deepEqual(depois.dados, []);
  });

  it('recusa produtores por validar, inexistentes, a própria página e endereços inválidos', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const porValidar = await criarConta('Quinta Por Validar', {
      papel: 'produtor',
      aprovado: false,
    });
    const ana = await criarConta('Ana Teixeira');
    const inexistente = new mongoose.Types.ObjectId();

    const pendente = await pedir(
      'PUT',
      `/producers/${porValidar.id}/favorito`,
      {
        token: ana.token,
      },
    );
    const naoExiste = await pedir('PUT', `/producers/${inexistente}/favorito`, {
      token: ana.token,
    });
    const proprio = await pedir('PUT', `/producers/${abel.id}/favorito`, {
      token: abel.token,
    });
    const invalido = await pedir('PUT', '/producers/abc/favorito', {
      token: ana.token,
    });

    assert.equal(pendente.estado, 404);
    assert.equal(naoExiste.estado, 404);
    assert.equal(proprio.estado, 400);
    assert.equal(invalido.estado, 400);
  });
});

describe('página dos produtores', () => {
  it('pesquisa no nome, no concelho e na freguesia', async () => {
    await criarConta('Quinta do Abel', { papel: 'produtor' });
    // Monção (1604), freguesia de Barbeita (160404)
    await criarConta('Horta da Rosa', {
      papel: 'produtor',
      concelho: '1604',
      freguesia: '160404',
    });

    const porNome = await pedir('GET', '/producers?q=abel');
    const porConcelho = await pedir('GET', '/producers?q=mon%C3%A7%C3%A3o');
    const porFreguesia = await pedir('GET', '/producers?q=barbeita');
    const especial = await pedir('GET', '/producers?q=(');

    assert.deepEqual(nomes(porNome), ['Quinta do Abel']);
    assert.deepEqual(nomes(porConcelho), ['Horta da Rosa']);
    assert.deepEqual(nomes(porFreguesia), ['Horta da Rosa']);
    assert.equal(especial.estado, 200);
    assert.deepEqual(especial.dados, []);
  });

  it('ordena pelos mais requisitados, mais bem avaliados e novos', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const rosa = await criarConta('Horta da Rosa', { papel: 'produtor' });
    const zeca = await criarConta('Apiário do Zeca', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    const kiwi = await criarProduto(abel.token, 'Kiwi');
    const grelos = await criarProduto(rosa.token, 'Grelos');
    const mel = await criarProduto(zeca.token, 'Mel');

    // Abel: 2 entregues; Rosa: 1; Zeca: 3, mas duas de há 100 dias, que já não contam
    await entregue(ana, abel, kiwi);
    const avaliada = await entregue(ana, abel, kiwi);
    await entregue(ana, rosa, grelos);
    for (let vez = 0; vez < 3; vez++) {
      const encomenda = await entregue(ana, zeca, mel);
      if (vez < 2) {
        await Order.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(String(encomenda)) },
          {
            $set: {
              'historico.$[passo].data': new Date(Date.now() - 100 * DIA),
            },
          },
          { arrayFilters: [{ 'passo.estado': 'entregue' }] },
        );
      }
    }
    // Avaliações: Rosa 5, Abel 3; o Zeca não tem
    const encomendaDaRosa = await Order.findOne({ produtor: rosa.id });
    await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda: String(encomendaDaRosa._id), classificacao: 5 },
    });
    await pedir('POST', '/reviews', {
      token: ana.token,
      corpo: { encomenda: avaliada, classificacao: 3 },
    });

    const requisitados = await pedir('GET', '/producers?ordem=requisitados');
    const avaliados = await pedir('GET', '/producers?ordem=avaliados');
    const novos = await pedir('GET', '/producers?ordem=novos');
    const alfabetica = await pedir('GET', '/producers');

    assert.deepEqual(nomes(requisitados), [
      'Quinta do Abel',
      'Apiário do Zeca',
      'Horta da Rosa',
    ]);
    assert.deepEqual(nomes(avaliados), [
      'Horta da Rosa',
      'Quinta do Abel',
      'Apiário do Zeca',
    ]);
    assert.deepEqual(nomes(novos), [
      'Apiário do Zeca',
      'Horta da Rosa',
      'Quinta do Abel',
    ]);
    assert.deepEqual(nomes(alfabetica), [
      'Apiário do Zeca',
      'Horta da Rosa',
      'Quinta do Abel',
    ]);
  });
});
