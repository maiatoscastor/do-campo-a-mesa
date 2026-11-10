import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { io as ligar } from 'socket.io-client';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { ligarSockets } from '../src/sockets/index.js';
import { formatarEuros } from '../src/utils/dinheiro.js';
import { cifrarPassword } from '../src/utils/password.js';

const PASSWORD = 'uma-password-de-teste';

let servidor;
let base;
let sockets = [];

// Base de dados à parte, e um servidor com a API e o Socket.io juntos, como no server.js
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  await Promise.all(
    [User, Product, Order, Notification].map((modelo) => modelo.init()),
  );
  servidor = createServer(app);
  app.set('io', ligarSockets(servidor));
  await new Promise((resolver) => servidor.listen(0, resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Notification, Order, Product, User].map((modelo) => modelo.deleteMany({})),
  );
}

beforeEach(limpar);

afterEach(() => {
  for (const socket of sockets) {
    socket.disconnect();
  }
  sockets = [];
});

after(async () => {
  await limpar();
  app.get('io').close();
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
  if (aprovado && papel === 'produtor') {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

async function cliente(token) {
  const socket = ligar(base, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });
  sockets.push(socket);
  await new Promise((resolver, rejeitar) => {
    socket.once('connect', resolver);
    socket.once('connect_error', rejeitar);
  });
  return socket;
}

function proximo(socket, evento) {
  return new Promise((resolver) => socket.once(evento, resolver));
}

// Um produtor com um produto, e uma encomenda desse produto feita pela Ana
async function umaEncomenda() {
  const produtor = await criarConta('Quinta do Abel', { papel: 'produtor' });
  const ana = await criarConta('Ana Teixeira');
  const { dados: produto } = await pedir('POST', '/products', {
    token: produtor.token,
    corpo: {
      nome: 'Mel',
      categoria: 'Mel',
      preco: 8.5,
      unidade: 'frasco',
      stock: 10,
    },
  });
  return { produtor, ana, produto };
}

describe('avisos em tempo real', () => {
  it('o produtor é avisado de uma encomenda nova', async () => {
    const { produtor, ana, produto } = await umaEncomenda();
    const doProdutor = await cliente(produtor.token);
    const aviso = proximo(doProdutor, 'nova-encomenda');
    const notificacao = proximo(doProdutor, 'notificacao');

    const { dados } = await pedir('POST', '/orders', {
      token: ana.token,
      corpo: {
        linhas: [{ produto: produto.id, quantidade: 2 }],
        modo: 'levantamento',
      },
    });

    assert.deepEqual(await aviso, { id: dados[0].id });
    const { texto, ligacao, lida } = await notificacao;
    assert.equal(
      texto,
      `Nova encomenda de Ana Teixeira: ${formatarEuros(17)}.`,
    );
    assert.equal(ligacao, '/conta/encomendas');
    assert.equal(lida, false);
  });

  it('o comprador é avisado quando o produtor muda o estado, e só ele', async () => {
    const { produtor, ana, produto } = await umaEncomenda();
    const rui = await criarConta('Rui');
    const { dados } = await pedir('POST', '/orders', {
      token: ana.token,
      corpo: {
        linhas: [{ produto: produto.id, quantidade: 1 }],
        modo: 'levantamento',
      },
    });
    // A Ana tem a aplicação aberta em dois dispositivos: os dois recebem o aviso
    const anaNoTelemovel = await cliente(ana.token);
    const anaNoPortatil = await cliente(ana.token);
    const doRui = await cliente(rui.token);
    let ruiRecebeu = false;
    doRui.on('encomenda-atualizada', () => {
      ruiRecebeu = true;
    });
    const avisos = Promise.all([
      proximo(anaNoTelemovel, 'encomenda-atualizada'),
      proximo(anaNoPortatil, 'encomenda-atualizada'),
    ]);

    await pedir('PATCH', `/orders/${dados[0].id}/estado`, {
      token: produtor.token,
      corpo: { estado: 'confirmada' },
    });

    const [noTelemovel, noPortatil] = await avisos;
    assert.deepEqual(noTelemovel, { id: dados[0].id, estado: 'confirmada' });
    assert.deepEqual(noPortatil, noTelemovel);
    assert.equal(ruiRecebeu, false);
  });

  it('o produtor é avisado quando o administrador valida a conta', async () => {
    const pendente = await criarConta('Quinta Nova', {
      papel: 'produtor',
      aprovado: false,
    });
    await User.create({
      nome: 'Admin',
      email: 'admin@teste.pt',
      passwordHash: await cifrarPassword(PASSWORD),
      papel: 'admin',
    });
    const { dados: sessao } = await pedir('POST', '/auth/login', {
      corpo: { email: 'admin@teste.pt', password: PASSWORD },
    });
    const doProdutor = await cliente(pendente.token);
    const aviso = proximo(doProdutor, 'conta-validada');

    await pedir('PATCH', `/admin/produtores/${pendente.id}/validacao`, {
      token: sessao.token,
      corpo: { aprovado: true },
    });

    assert.deepEqual(await aviso, { aprovado: true });
  });
});

describe('notificações guardadas', () => {
  it('quem não estava ligado vê a notificação depois, e pode marcá-la como lida', async () => {
    const { produtor, ana, produto } = await umaEncomenda();
    const rui = await criarConta('Rui');
    const { dados } = await pedir('POST', '/orders', {
      token: ana.token,
      corpo: {
        linhas: [{ produto: produto.id, quantidade: 1 }],
        modo: 'levantamento',
      },
    });
    // A Ana não tem a aplicação aberta: não há nenhuma ligação dela
    await pedir('PATCH', `/orders/${dados[0].id}/estado`, {
      token: produtor.token,
      corpo: { estado: 'confirmada' },
    });

    const daAna = await pedir('GET', '/notifications', { token: ana.token });
    const doRui = await pedir('GET', '/notifications', { token: rui.token });
    const lidas = await pedir('PATCH', '/notifications/lidas', {
      token: ana.token,
    });
    const depois = await pedir('GET', '/notifications', { token: ana.token });
    const semSessao = await pedir('GET', '/notifications');

    assert.equal(daAna.dados.porLer, 1);
    assert.equal(
      daAna.dados.notificacoes[0].texto,
      'Quinta do Abel confirmou a sua encomenda.',
    );
    assert.equal(daAna.dados.notificacoes[0].ligacao, '/encomendas');
    assert.equal(daAna.dados.notificacoes[0].tipo, 'encomenda');
    assert.deepEqual(doRui.dados, { porLer: 0, notificacoes: [] });
    assert.equal(lidas.estado, 204);
    assert.equal(depois.dados.porLer, 0);
    assert.equal(depois.dados.notificacoes[0].lida, true);
    assert.equal(semSessao.estado, 401);
  });
});
