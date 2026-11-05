import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { io as ligar } from 'socket.io-client';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Auction } from '../src/models/Auction.js';
import { Bid } from '../src/models/Bid.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { fecharExpirados } from '../src/services/cicloLeiloes.js';
import { ligarSockets } from '../src/sockets/index.js';
import { formatarEuros } from '../src/utils/dinheiro.js';
import { cifrarPassword } from '../src/utils/password.js';

const PASSWORD = 'uma-password-de-teste';
const MINUTO = 60 * 1000;

let servidor;
let io;
let base;
let sockets = [];

// Base de dados à parte, como nos outros testes, e um servidor com a API e o Socket.io juntos
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  // As coleções têm de existir antes das transações que escrevem nelas
  await Promise.all(
    [User, Product, Auction, Bid, Order].map((modelo) => modelo.init()),
  );
  servidor = createServer(app);
  io = ligarSockets(servidor);
  await new Promise((resolver) => servidor.listen(0, resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Bid, Auction, Order, Product, User].map((modelo) => modelo.deleteMany({})),
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
  io.close();
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
    cabecalhos: resposta.headers,
    dados: texto ? JSON.parse(texto) : null,
  };
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
  if (aprovado && papel === 'produtor') {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

// Um produtor com um produto, e um leilão desse produto que começa já (ou com outros dados)
async function umLeilao(dados = {}) {
  const produtor = await criarConta('Quinta do Abel', { papel: 'produtor' });
  const produto = await pedir('POST', '/products', {
    token: produtor.token,
    corpo: {
      nome: 'Kiwi Hayward',
      categoria: 'Fruta',
      preco: 2.9,
      unidade: 'kg',
      stock: 10,
    },
  });
  const resposta = await pedir('POST', '/auctions', {
    token: produtor.token,
    corpo: {
      produto: produto.dados.id,
      lote: '200 kg',
      precoBase: 200,
      incremento: 5,
      duracao: 10,
      ...dados,
    },
  });
  return { produtor, produto: produto.dados, resposta, leilao: resposta.dados };
}

// Liga um cliente Socket.io, com ou sem sessão, e espera que a ligação esteja aceite
async function cliente(token) {
  const socket = ligar(base, {
    auth: token ? { token } : {},
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

// Espera pela próxima mensagem de um evento
function proximo(socket, evento) {
  return new Promise((resolver) => socket.once(evento, resolver));
}

// Espera até a presença anunciada ser este número: os avisos anteriores podem chegar mais tarde
function presencaIgual(socket, numero) {
  return new Promise((resolver, rejeitar) => {
    const limite = setTimeout(
      () => rejeitar(new Error(`A presença não chegou a ${numero}`)),
      5000,
    );
    socket.on('presenca', function ver(valor) {
      if (valor === numero) {
        clearTimeout(limite);
        socket.off('presenca', ver);
        resolver(valor);
      }
    });
  });
}

// Entra na sala de um leilão e devolve o estado recebido
async function entrar(socket, leilaoId) {
  const estado = proximo(socket, 'estado');
  socket.emit('entrar', leilaoId);
  return estado;
}

function licitar(socket, leilaoId, valor) {
  return socket.emitWithAck('licitar', { leilaoId, valor });
}

describe('criar leilões', () => {
  it('um produtor aprovado cria um leilão, que começa no preço base', async () => {
    const { resposta, produto } = await umLeilao();

    assert.equal(resposta.estado, 201);
    assert.equal(
      resposta.cabecalhos.get('location'),
      `/api/auctions/${resposta.dados.id}`,
    );
    assert.equal(resposta.dados.nome, 'Kiwi Hayward');
    assert.equal(resposta.dados.categoria, 'Fruta');
    assert.equal(resposta.dados.produto, produto.id);
    assert.equal(resposta.dados.licitacaoAtual.valor, 200);
    assert.equal(resposta.dados.minimo, 200);
    const duracao =
      new Date(resposta.dados.terminaEm) - new Date(resposta.dados.iniciaEm);
    assert.equal(duracao, 10 * MINUTO);
  });

  it('valida o produto, os valores, o início e a duração', async () => {
    const { produtor, produto } = await umLeilao();
    const outro = await criarConta('Quinta Alheia', { papel: 'produtor' });
    const criar = (dados, token = produtor.token) =>
      pedir('POST', '/auctions', {
        token,
        corpo: {
          produto: produto.id,
          lote: '200 kg',
          precoBase: 200,
          incremento: 5,
          duracao: 10,
          ...dados,
        },
      });

    const deOutro = await criar({}, outro.token);
    const invalido = await criar({
      precoBase: 0,
      incremento: 0.001,
      lote: '',
      duracao: 0,
      iniciaEm: '2020-01-01T10:00:00Z',
    });

    assert.equal(deOutro.estado, 400);
    assert.equal(
      deOutro.dados.detalhes.produto,
      'Escolha um dos seus produtos',
    );
    assert.deepEqual(Object.keys(invalido.dados.detalhes).sort(), [
      'duracao',
      'incremento',
      'iniciaEm',
      'lote',
      'precoBase',
    ]);
  });

  it('só os produtores aprovados criam leilões', async () => {
    const comprador = await criarConta('Ana');
    const pendente = await criarConta('Quinta Pendente', {
      papel: 'produtor',
      aprovado: false,
    });

    const semSessao = await pedir('POST', '/auctions', { corpo: {} });
    const deComprador = await pedir('POST', '/auctions', {
      token: comprador.token,
      corpo: {},
    });
    const dePendente = await pedir('POST', '/auctions', {
      token: pendente.token,
      corpo: {},
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(deComprador.estado, 403);
    assert.equal(dePendente.estado, 403);
  });

  it('a agenda mostra os leilões a decorrer e os próximos, com o produtor', async () => {
    const daqui = new Date(Date.now() + 60 * MINUTO).toISOString();
    const { produtor, produto } = await umLeilao({ iniciaEm: daqui });
    await pedir('POST', '/auctions', {
      token: produtor.token,
      corpo: {
        produto: produto.id,
        lote: '50 kg',
        precoBase: 40,
        incremento: 2,
        duracao: 5,
      },
    });

    const { dados } = await pedir('GET', '/auctions');
    const meus = await pedir('GET', '/auctions/meus', {
      token: produtor.token,
    });

    // Primeiro o que começa já, depois o que começa daqui a uma hora
    assert.deepEqual(
      dados.map(({ lote }) => lote),
      ['50 kg', '200 kg'],
    );
    assert.equal(dados[0].produtor.nomeExploracao, 'Quinta do Abel');
    assert.equal(meus.dados.length, 2);
  });

  it('o produtor só cancela um leilão que ainda não começou', async () => {
    const daqui = new Date(Date.now() + 60 * MINUTO).toISOString();
    const {
      produtor,
      produto,
      leilao: futuro,
    } = await umLeilao({ iniciaEm: daqui });
    const outro = await criarConta('Quinta Alheia', { papel: 'produtor' });
    const { dados: jaComecou } = await pedir('POST', '/auctions', {
      token: produtor.token,
      corpo: {
        produto: produto.id,
        lote: '10 kg',
        precoBase: 10,
        incremento: 1,
        duracao: 5,
      },
    });

    const deOutro = await pedir('DELETE', `/auctions/${futuro.id}`, {
      token: outro.token,
    });
    const aDecorrer = await pedir('DELETE', `/auctions/${jaComecou.id}`, {
      token: produtor.token,
    });
    const cancelado = await pedir('DELETE', `/auctions/${futuro.id}`, {
      token: produtor.token,
    });

    assert.equal(deOutro.estado, 403);
    assert.equal(aDecorrer.estado, 409);
    assert.equal(cancelado.estado, 204);
    assert.equal(await Auction.countDocuments(), 1);
  });
});

describe('sala do leilão (Socket.io)', () => {
  it('quem entra recebe o estado e a hora do servidor; a presença conta pessoas', async () => {
    const { leilao } = await umLeilao();
    const ana = await criarConta('Ana');
    const visitante = await cliente();
    const anaNoPortatil = await cliente(ana.token);
    const anaNoTelemovel = await cliente(ana.token);

    const estado = await entrar(visitante, leilao.id);
    await entrar(anaNoPortatil, leilao.id);
    // O primeiro aviso de presença que o telemóvel recebe é o da sua própria entrada. A Ana com dois
    // separadores conta uma vez: são 2 pessoas, e não 3.
    const presenca = proximo(anaNoTelemovel, 'presenca');
    await entrar(anaNoTelemovel, leilao.id);

    assert.equal(estado.leilao.id, leilao.id);
    assert.ok(Math.abs(new Date(estado.agora) - Date.now()) < 5000);
    assert.deepEqual(estado.licitacoes, []);
    assert.equal(await presenca, 2);

    // Quando a Ana fecha os dois separadores, quem fica vê a presença descer até só ele
    anaNoPortatil.disconnect();
    anaNoTelemovel.disconnect();
    assert.equal(await presencaIgual(visitante, 1), 1);
  });

  it('aceita a primeira licitação no preço base e anuncia-a a toda a sala', async () => {
    const { leilao } = await umLeilao();
    const ana = await criarConta('Ana Maria Teixeira');
    const deAna = await cliente(ana.token);
    const visitante = await cliente();
    await entrar(visitante, leilao.id);

    const anuncio = proximo(visitante, 'nova-licitacao');
    const resposta = await licitar(deAna, leilao.id, 200);
    const { licitacao, licitacaoAtual, minimo } = await anuncio;

    assert.deepEqual(resposta, { ok: true });
    assert.equal(licitacao.valor, 200);
    // Os outros veem só o primeiro nome e a inicial
    assert.equal(licitacao.nome, 'Ana T.');
    assert.equal(licitacaoAtual.comprador, ana.id);
    assert.equal(minimo, 205);
  });

  it('recusa valores abaixo do mínimo, visitantes, administradores e o próprio produtor', async () => {
    const { leilao, produtor } = await umLeilao();
    const ana = await criarConta('Ana');
    const deAna = await cliente(ana.token);
    const deRui = await cliente((await criarConta('Rui')).token);
    await licitar(deRui, leilao.id, 200);

    const abaixo = await licitar(deAna, leilao.id, 204.99);
    const decimais = await licitar(deAna, leilao.id, 210.001);
    const visitante = await licitar(await cliente(), leilao.id, 300);
    const doProdutor = await licitar(
      await cliente(produtor.token),
      leilao.id,
      300,
    );
    await User.create({
      nome: 'Admin',
      email: 'admin@teste.pt',
      passwordHash: await cifrarPassword(PASSWORD),
      papel: 'admin',
    });
    const { dados: sessaoDoAdmin } = await pedir('POST', '/auth/login', {
      corpo: { email: 'admin@teste.pt', password: PASSWORD },
    });
    const doAdmin = await licitar(
      await cliente(sessaoDoAdmin.token),
      leilao.id,
      300,
    );

    assert.deepEqual(abaixo, {
      ok: false,
      erro: `A licitação mínima é agora ${formatarEuros(205)}`,
    });
    assert.equal(decimais.ok, false);
    assert.equal(visitante.erro, 'Entre na sua conta para licitar');
    assert.equal(doProdutor.erro, 'Não pode licitar no seu próprio leilão');
    assert.equal(doAdmin.erro, 'As contas de administrador não licitam');
    assert.equal(await Bid.countDocuments(), 1);
  });

  it('recusa licitações antes de começar e depois de acabar', async () => {
    const daqui = new Date(Date.now() + 60 * MINUTO).toISOString();
    const { leilao } = await umLeilao({ iniciaEm: daqui });
    const ana = await criarConta('Ana');
    const deAna = await cliente(ana.token);

    const cedo = await licitar(deAna, leilao.id, 200);
    await Auction.updateOne(
      { _id: leilao.id },
      {
        iniciaEm: new Date(Date.now() - 20 * MINUTO),
        terminaEm: new Date(Date.now() - MINUTO),
      },
    );
    const tarde = await licitar(deAna, leilao.id, 200);

    assert.equal(cedo.erro, 'O leilão ainda não começou');
    assert.equal(tarde.erro, 'O leilão já terminou');
  });

  it('com duas licitações iguais ao mesmo tempo, aceita só uma', async () => {
    const { leilao } = await umLeilao();
    const ana = await cliente((await criarConta('Ana')).token);
    const rui = await cliente((await criarConta('Rui')).token);
    const eva = await cliente((await criarConta('Eva')).token);
    await licitar(eva, leilao.id, 200);

    // A Ana e o Rui oferecem 205 € quase no mesmo instante: só a primeira a chegar cumpre a condição
    const respostas = await Promise.all([
      licitar(ana, leilao.id, 205),
      licitar(rui, leilao.id, 205),
    ]);

    assert.deepEqual(respostas.map(({ ok }) => ok).sort(), [false, true]);
    assert.equal(
      respostas.find(({ ok }) => !ok).erro,
      `A licitação mínima é agora ${formatarEuros(210)}`,
    );
    const final = await Auction.findById(leilao.id);
    assert.equal(final.licitacaoAtual.valor, 205);
    assert.equal(final.numeroDeLicitacoes, 2);
    assert.equal(await Bid.countDocuments({ valor: 205 }), 1);
  });

  it('com muitas licitações ao mesmo tempo, o histórico fica sempre coerente', async () => {
    const { leilao } = await umLeilao();
    const clientes = [];
    for (let i = 0; i < 8; i += 1) {
      clientes.push(await cliente((await criarConta(`Comprador ${i}`)).token));
    }

    // Cada um oferece um valor diferente, todos ao mesmo tempo
    await Promise.all(
      clientes.map((socket, i) => licitar(socket, leilao.id, 200 + i * 5)),
    );

    const final = await Auction.findById(leilao.id);
    const licitacoes = await Bid.find({ leilao: leilao.id }).sort({
      ordem: 1,
    });
    assert.equal(final.numeroDeLicitacoes, licitacoes.length);
    assert.equal(final.licitacaoAtual.valor, licitacoes.at(-1).valor);
    // Pela ordem em que foram aceites, cada licitação subiu pelo menos o incremento
    for (let i = 1; i < licitacoes.length; i += 1) {
      assert.equal(licitacoes[i].ordem, i + 1);
      assert.ok(licitacoes[i].valor >= licitacoes[i - 1].valor + 5);
    }
  });
});

describe('quem já está a ganhar', () => {
  it('não licita sobre si próprio, até alguém passar à frente', async () => {
    const { leilao } = await umLeilao();
    const ana = await cliente((await criarConta('Ana')).token);
    const rui = await cliente((await criarConta('Rui')).token);

    await licitar(ana, leilao.id, 200);
    const outraVez = await licitar(ana, leilao.id, 250);
    const doRui = await licitar(rui, leilao.id, 205);
    const depoisDoRui = await licitar(ana, leilao.id, 210);

    assert.deepEqual(outraVez, {
      ok: false,
      erro: 'A sua licitação já é a mais alta',
    });
    assert.equal(doRui.ok, true);
    assert.equal(depoisDoRui.ok, true);
    assert.equal(await Bid.countDocuments(), 3);
  });
});

describe('licitações nos últimos segundos', () => {
  it('uma licitação nos últimos 30 s prolonga o fim até 30 s depois dela', async () => {
    const { leilao } = await umLeilao();
    const ana = await cliente((await criarConta('Ana')).token);
    await Auction.updateOne(
      { _id: leilao.id },
      { terminaEm: new Date(Date.now() + 10 * 1000) },
    );
    const naSala = await cliente();
    await entrar(naSala, leilao.id);
    const anuncio = proximo(naSala, 'nova-licitacao');

    const antes = Date.now();
    await licitar(ana, leilao.id, 200);
    const { terminaEm } = await anuncio;

    // O novo fim fica a 30 s da licitação (com margem para o tempo do pedido)
    const novoFim = new Date(terminaEm).getTime();
    assert.ok(novoFim >= antes + 30 * 1000);
    assert.ok(novoFim <= Date.now() + 30 * 1000);
  });

  it('longe do fim, a hora de fim não muda', async () => {
    const { leilao } = await umLeilao();
    const ana = await cliente((await criarConta('Ana')).token);

    await licitar(ana, leilao.id, 200);

    // Lido diretamente da coleção: o pipeline não passa pela conversão do Mongoose, por isso
    // confirma-se que o comprador ficou gravado como ObjectId e a data como data
    const depois = await Auction.collection.findOne({
      _id: new mongoose.Types.ObjectId(leilao.id),
    });
    assert.equal(depois.terminaEm.toISOString(), leilao.terminaEm);
    assert.equal(depois.licitacaoAtual.nome, 'Ana');
    assert.ok(
      depois.licitacaoAtual.comprador instanceof mongoose.Types.ObjectId,
    );
    assert.ok(depois.licitacaoAtual.data instanceof Date);
  });

  it('um leilão prolongado não fecha à hora antiga', async () => {
    const { leilao } = await umLeilao();
    const ana = await cliente((await criarConta('Ana')).token);
    await Auction.updateOne(
      { _id: leilao.id },
      { terminaEm: new Date(Date.now() + 2000) },
    );
    await licitar(ana, leilao.id, 200);
    // Passa a hora antiga
    await new Promise((resolver) => setTimeout(resolver, 2500));

    await fecharExpirados(io);

    assert.notEqual((await Auction.findById(leilao.id)).estado, 'terminado');
    assert.equal(await Order.countDocuments(), 0);
  });
});

describe('fim do leilão', () => {
  it('o vencedor recebe uma encomenda confirmada com o lote, uma só vez', async () => {
    const { leilao, produtor } = await umLeilao();
    const ana = await criarConta('Ana');
    const deAna = await cliente(ana.token);
    await licitar(deAna, leilao.id, 230);
    await Auction.updateOne(
      { _id: leilao.id },
      { terminaEm: new Date(Date.now() - 1000) },
    );
    const naSala = await cliente();
    await entrar(naSala, leilao.id);
    const fim = proximo(naSala, 'terminado');
    const ganho = proximo(deAna, 'leilao-ganho');

    await fecharExpirados(io);
    await fecharExpirados(io);

    const encomendas = await Order.find();
    assert.equal(encomendas.length, 1);
    assert.equal(encomendas[0].comprador.toString(), ana.id);
    assert.equal(encomendas[0].produtor.toString(), produtor.id);
    assert.equal(encomendas[0].total, 230);
    assert.equal(encomendas[0].estado, 'confirmada');
    assert.equal(encomendas[0].origem, 'leilao');
    assert.equal(encomendas[0].linhas[0].nome, 'Kiwi Hayward (lote: 200 kg)');
    assert.deepEqual(await fim, {
      id: leilao.id,
      vencedor: 'Ana',
      valor: 230,
    });
    assert.equal((await ganho).encomenda, encomendas[0].id);
    assert.equal((await Auction.findById(leilao.id)).estado, 'terminado');
  });

  it('sem licitações, acaba sem encomenda', async () => {
    const { leilao } = await umLeilao();
    await Auction.updateOne(
      { _id: leilao.id },
      { terminaEm: new Date(Date.now() - 1000) },
    );

    await fecharExpirados(io);

    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await Auction.findById(leilao.id)).estado, 'terminado');
  });
});
