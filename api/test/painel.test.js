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

describe('painel do administrador', () => {
  it('é só para administradores', async () => {
    const ana = await criarConta('Ana Teixeira');

    const semSessao = await pedir('GET', '/admin/painel');
    const comprador = await pedir('GET', '/admin/painel', { token: ana.token });

    assert.equal(semSessao.estado, 401);
    assert.equal(comprador.estado, 403);
  });

  it('conta os utilizadores, os produtos, as encomendas dos últimos 30 dias e os leilões', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    await criarConta('Quinta Por Validar', {
      papel: 'produtor',
      aprovado: false,
    });
    const ana = await criarConta('Ana Teixeira');
    const rui = await criarConta('Rui Costa');
    const kiwi = await criarProduto(abel.token, 'Kiwi', 2.5);
    await criarProduto(abel.token, 'Mel', 8);
    await encomendar(ana, kiwi, 2); // 5 €
    await encomendar(rui, kiwi, 1); // 2,50 €
    // Uma encomenda de há 40 dias, que conta para os 30 dias anteriores
    const antiga = await encomendar(rui, kiwi, 4); // 10 €
    // (o createdAt do Mongoose não se muda: escreve-se diretamente na coleção)
    await Order.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(String(antiga)) },
      { $set: { createdAt: new Date(Date.now() - 40 * DIA) } },
    );
    await pedir('POST', '/auctions', {
      token: abel.token,
      corpo: {
        produto: kiwi,
        quantidade: 10,
        precoBase: 20,
        incremento: 1,
        duracao: 10,
      },
    });
    await pedir('POST', '/auctions', {
      token: abel.token,
      corpo: {
        produto: kiwi,
        quantidade: 5,
        precoBase: 10,
        incremento: 1,
        duracao: 10,
        iniciaEm: new Date(Date.now() + DIA).toISOString(),
      },
    });
    // O ciclo dos leilões não corre nos testes: o primeiro passa a ativo à mão
    await Auction.updateOne({ quantidade: 10 }, { estado: 'ativo' });

    const { estado, dados } = await pedir('GET', '/admin/painel', {
      token: admin,
    });

    assert.equal(estado, 200);
    assert.deepEqual(dados.utilizadores, {
      compradores: 2,
      produtores: 2,
      administradores: 1,
      novos: 5,
      produtoresPorEstado: {
        aprovados: 1,
        porValidar: 1,
        rejeitados: 0,
        suspensos: 0,
        banidos: 0,
      },
    });
    assert.equal(dados.produtos, 2);
    assert.deepEqual(dados.encomendas, {
      ultimos30: { quantas: 2, valor: 7.5 },
      anteriores30: { quantas: 1, valor: 10 },
      porEstado: { pendente: 3 },
    });
    assert.equal(dados.leiloes.aDecorrer, 1);
    assert.equal(dados.leiloes.marcados, 1);
    // O leilão a decorrer, com a licitação atual (sem o Socket.io, nos testes, não há pessoas a contar)
    assert.deepEqual(
      dados.leiloes.lista.map(
        ({ nome, lote, licitacaoAtual, participantes }) => [
          nome,
          lote,
          licitacaoAtual,
          participantes,
        ],
      ),
      [['Kiwi', '10 kg', 20, null]],
    );
    // As mais recentes primeiro, com o comprador e o produtor
    assert.equal(dados.ultimasEncomendas.length, 3);
    assert.equal(dados.ultimasEncomendas[0].comprador, 'Rui Costa');
    assert.equal(
      dados.ultimasEncomendas[0].produtor.nomeExploracao,
      'Quinta do Abel',
    );
    assert.deepEqual(
      dados.ultimosRegistos.map(({ nome, papel }) => [nome, papel]),
      [
        ['Rui Costa', 'comprador'],
        ['Ana Teixeira', 'comprador'],
        ['Quinta Por Validar', 'produtor'],
        ['Quinta do Abel', 'produtor'],
        ['Administrador de Teste', 'admin'],
      ],
    );
    assert.equal(dados.ultimosRegistos[2].validacao, 'pendente');
  });
});

describe('estado dos serviços', () => {
  it('é só para administradores', async () => {
    const ana = await criarConta('Ana Teixeira');

    const semSessao = await pedir('GET', '/admin/servicos');
    const comprador = await pedir('GET', '/admin/servicos', {
      token: ana.token,
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(comprador.estado, 403);
  });

  it('verifica a API, o MongoDB, o armazenamento e a documentação', async () => {
    const admin = await criarAdmin();

    const { estado, dados } = await pedir('GET', '/admin/servicos', {
      token: admin,
    });
    const porServico = Object.fromEntries(
      dados.servicos.map((servico) => [servico.servico, servico]),
    );

    assert.equal(estado, 200);
    assert.equal(porServico.api.estado, 'ok');
    assert.equal(porServico.mongodb.estado, 'ok');
    assert.match(porServico.mongodb.detalhes.baseDeDados, /-teste$/);
    assert.equal(porServico.armazenamento.estado, 'ok');
    assert.equal(porServico.swagger.estado, 'ok');
    assert.ok(porServico.swagger.detalhes.operacoes > 40);
    // Nos testes, a API corre sem o Socket.io: a verificação diz que não está a correr, sem
    // pormenores técnicos
    assert.equal(porServico.socket.estado, 'erro');
    assert.equal(porServico.socket.mensagem, 'O Socket.io não está a correr');
  });
});
