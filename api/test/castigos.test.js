import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Auction } from '../src/models/Auction.js';
import { Bid } from '../src/models/Bid.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { Report } from '../src/models/Report.js';
import { User } from '../src/models/User.js';
import { tirarCastigo } from '../src/services/castigos.js';
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
    [User, Product, Order, Auction, Bid, Report, Notification].map((modelo) =>
      modelo.init(),
    ),
  );
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Bid, Auction, Report, Notification, Order, Product, User].map((modelo) =>
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
  return { token: dados.token, id: dados.utilizador.id };
}

async function criarProduto(token, nome, stock = 50) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Fruta', preco: 2, unidade: 'kg', stock },
  });
  return dados.id;
}

function denunciar(produtor, quem, corpo = { motivo: 'nao-entregou' }) {
  return pedir('POST', `/producers/${produtor.id}/denuncias`, {
    token: quem.token,
    corpo,
  });
}

function decidir(produtor, admin, corpo) {
  return pedir('PATCH', `/admin/produtores/${produtor.id}/moderacao`, {
    token: admin.token,
    corpo,
  });
}

const textos = async (utilizador) =>
  (
    await Notification.find({ utilizador: utilizador.id }).sort({
      createdAt: 1,
      _id: 1,
    })
  ).map(({ texto }) => texto);

const daquiA = (dias) => new Date(Date.now() + dias * DIA).toISOString();

describe('denunciar um produtor', () => {
  it('pede sessão, não deixa denunciar a própria página e valida o motivo', async () => {
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const porValidar = await criarConta('Quinta Por Validar', {
      papel: 'produtor',
      aprovado: false,
    });
    const ana = await criarConta('Ana Teixeira');

    const semSessao = await pedir('POST', `/producers/${abel.id}/denuncias`, {
      corpo: { motivo: 'nao-entregou' },
    });
    const propria = await denunciar(abel, abel);
    const semMotivo = await denunciar(abel, ana, {});
    const motivoDeAvaliacao = await denunciar(abel, ana, {
      motivo: 'publicidade',
    });
    const outroSemDescricao = await denunciar(abel, ana, { motivo: 'outro' });
    const pendente = await denunciar(porValidar, ana);

    assert.equal(semSessao.estado, 401);
    assert.equal(propria.estado, 403);
    assert.equal(semMotivo.estado, 400);
    assert.equal(semMotivo.dados.detalhes.motivo, 'Escolha um motivo');
    assert.equal(motivoDeAvaliacao.estado, 400);
    assert.equal(outroSemDescricao.estado, 400);
    assert.equal(
      outroSemDescricao.dados.detalhes.descricao,
      'Conte o que se passa',
    );
    assert.equal(pendente.estado, 404);
  });

  it('aceita uma denúncia por decidir de cada vez, e avisa o administrador da primeira', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    const rui = await criarConta('Rui Costa');

    const primeira = await denunciar(abel, ana, {
      motivo: 'outro',
      descricao: 'Fotografias que não são da quinta',
    });
    const repetida = await denunciar(abel, ana);
    const doRui = await denunciar(abel, rui);
    const pagina = await pedir('GET', `/producers/${abel.id}`, {
      token: ana.token,
    });
    const paginaSemSessao = await pedir('GET', `/producers/${abel.id}`);
    const resumo = await pedir('GET', '/admin/resumo', { token: admin.token });

    assert.equal(primeira.estado, 201);
    assert.equal(repetida.estado, 409);
    assert.equal(doRui.estado, 201);
    assert.equal(pagina.dados.denunciado, true);
    assert.equal(paginaSemSessao.dados.denunciado, undefined);
    assert.equal(resumo.dados.denunciasDeProdutores, 1);
    assert.equal(resumo.dados.denunciasPorDecidir, 1);
    // Uma só notificação, da primeira denúncia (o registo do produtor também avisa o administrador)
    assert.deepEqual(
      (await textos(admin)).filter((texto) => texto.includes('denúncia')),
      ['Nova denúncia de um produtor: Quinta do Abel.'],
    );
  });
});

describe('decisão do administrador', () => {
  it('é só para administradores, e valida a decisão, o motivo e a data', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');

    const semDenuncias = await decidir(abel, admin, {
      decisao: 'aviso',
      motivo: 'Teste',
    });
    await denunciar(abel, ana);
    const doComprador = await decidir(abel, ana, {
      decisao: 'aviso',
      motivo: 'Teste',
    });
    const semMotivo = await decidir(abel, admin, { decisao: 'aviso' });
    const semData = await decidir(abel, admin, {
      decisao: 'suspensao',
      motivo: 'Teste',
    });
    const noPassado = await decidir(abel, admin, {
      decisao: 'suspensao',
      motivo: 'Teste',
      ate: daquiA(-1),
    });
    const demasiado = await decidir(abel, admin, {
      decisao: 'suspensao',
      motivo: 'Teste',
      ate: daquiA(400),
    });

    assert.equal(semDenuncias.estado, 409);
    assert.equal(doComprador.estado, 403);
    assert.equal(
      semMotivo.dados.detalhes.motivo,
      'Escreva o motivo da decisão',
    );
    assert.equal(
      semData.dados.detalhes.ate,
      'Escolha até quando fica suspenso',
    );
    assert.equal(noPassado.dados.detalhes.ate, 'A data tem de ser no futuro');
    assert.equal(
      demasiado.dados.detalhes.ate,
      'A suspensão pode ir, no máximo, até daqui a um ano',
    );
  });

  it('dá um aviso: o produtor recebe o motivo, quem denunciou a decisão, e ele continua a vender', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    await criarProduto(abel.token, 'Kiwi');
    await denunciar(abel, ana);

    const { estado, dados } = await decidir(abel, admin, {
      decisao: 'aviso',
      motivo: 'Confirme as entregas com os compradores.',
    });
    const catalogo = await pedir('GET', '/products');
    const porDecidir = await pedir('GET', '/admin/denuncias?tipo=produtor', {
      token: admin.token,
    });
    const decididas = await pedir(
      'GET',
      '/admin/denuncias?tipo=produtor&estado=decidida',
      { token: admin.token },
    );

    assert.equal(estado, 200);
    assert.deepEqual(dados.historico, { avisos: 1, suspensoes: 0 });
    assert.equal(dados.denuncias[0].decisao, 'aviso');
    assert.equal(catalogo.dados.length, 1);
    assert.equal(porDecidir.dados.casos.length, 0);
    assert.equal(decididas.dados.casos.length, 1);
    assert.deepEqual(await textos(abel), [
      'Recebeu um aviso da administração sobre a sua conta de produtor. Motivo: Confirme as entregas com os compradores.',
    ]);
    assert.deepEqual(await textos(ana), [
      'A sua denúncia de Quinta do Abel foi analisada e foram tomadas medidas. Obrigado por ajudar.',
    ]);
    // Depois da decisão, a mesma pessoa pode voltar a denunciar
    assert.equal((await denunciar(abel, ana)).estado, 201);
  });

  it('rejeita: quem denunciou recebe o motivo, e o produtor não é avisado', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    await denunciar(abel, ana);

    await decidir(abel, admin, {
      decisao: 'rejeitada',
      motivo: 'A encomenda foi entregue.',
    });

    assert.deepEqual(await textos(abel), []);
    assert.deepEqual(await textos(ana), [
      'A sua denúncia de Quinta do Abel foi analisada e não vai haver medidas. Motivo: A encomenda foi entregue.',
    ]);
  });
});

describe('suspensão', () => {
  it('tira o produtor da loja, cancela os leilões e devolve o stock, até ser levantada', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    const rui = await criarConta('Rui Costa');
    const kiwi = await criarProduto(abel.token, 'Kiwi', 50);
    await pedir('PUT', `/producers/${abel.id}/favorito`, { token: rui.token });

    // Um leilão a decorrer, com o lote tirado do stock e uma licitação do Rui, e um marcado
    const aDecorrer = await pedir('POST', '/auctions', {
      token: abel.token,
      corpo: {
        produto: kiwi,
        quantidade: 10,
        doStock: true,
        precoBase: 20,
        incremento: 1,
        duracao: 60,
      },
    });
    await pedir('POST', '/auctions', {
      token: abel.token,
      corpo: {
        produto: kiwi,
        quantidade: 5,
        precoBase: 10,
        incremento: 1,
        duracao: 30,
        iniciaEm: daquiA(2),
      },
    });
    await Auction.updateOne({ _id: aDecorrer.dados.id }, { estado: 'ativo' });
    await Bid.create({
      leilao: aDecorrer.dados.id,
      comprador: rui.id,
      nome: 'Rui C.',
      valor: 20,
      ordem: 1,
    });
    await Notification.deleteMany({});
    await denunciar(abel, ana);

    const ate = daquiA(7);
    const decisao = await decidir(abel, admin, {
      decisao: 'suspensao',
      motivo: 'Várias encomendas por entregar.',
      ate,
    });

    const [catalogo, produtores, pagina, leiloes, eu] = await Promise.all([
      pedir('GET', '/products'),
      pedir('GET', '/producers'),
      pedir('GET', `/producers/${abel.id}`),
      pedir('GET', '/auctions'),
      pedir('GET', '/auth/eu', { token: abel.token }),
    ]);
    const novoProduto = await pedir('POST', '/products', {
      token: abel.token,
      corpo: {
        nome: 'Mel',
        categoria: 'Mel',
        preco: 8,
        unidade: 'frasco',
        stock: 3,
      },
    });
    const encomenda = await pedir('POST', '/orders', {
      token: ana.token,
      corpo: {
        linhas: [{ produto: kiwi, quantidade: 1 }],
        modo: 'levantamento',
      },
    });
    const estados = (await Auction.find().sort({ quantidade: -1 })).map(
      ({ estado }) => estado,
    );
    const stock = (await Product.findById(kiwi)).stock;

    assert.equal(decisao.estado, 200);
    assert.equal(decisao.dados.produtor.castigo.tipo, 'suspensao');
    assert.deepEqual(decisao.dados.historico, { avisos: 0, suspensoes: 1 });
    assert.deepEqual(catalogo.dados, []);
    assert.deepEqual(produtores.dados, []);
    assert.equal(pagina.estado, 404);
    assert.deepEqual(leiloes.dados, []);
    assert.equal(eu.dados.castigo.motivo, 'Várias encomendas por entregar.');
    assert.equal(novoProduto.estado, 403);
    assert.match(
      novoProduto.dados.erro,
      /^A sua conta de produtor está suspensa até /,
    );
    assert.equal(encomenda.estado, 409);
    assert.deepEqual(estados, ['cancelado', 'cancelado']);
    // Os 10 kg do lote voltaram ao stock (50 - 10 + 10)
    assert.equal(stock, 50);
    assert.match(
      (await textos(abel))[0],
      /^A sua conta de produtor foi suspensa até /,
    );
    assert.deepEqual(await textos(rui), [
      'O leilão de Kiwi (10 kg) foi cancelado. As licitações deixaram de contar.',
    ]);

    // Levantar mais cedo: volta tudo à loja
    const levantar = await pedir(
      'DELETE',
      `/admin/produtores/${abel.id}/castigo`,
      {
        token: admin.token,
      },
    );
    const outraVez = await pedir(
      'DELETE',
      `/admin/produtores/${abel.id}/castigo`,
      {
        token: admin.token,
      },
    );
    const depois = await pedir('GET', '/products');

    assert.equal(levantar.estado, 204);
    assert.equal(outraVez.estado, 404);
    assert.equal(depois.dados.length, 1);
    assert.equal(
      (await textos(abel)).at(-1),
      'A suspensão da sua conta de produtor foi levantada pelo administrador. Os seus produtos e a sua página voltaram à loja.',
    );
  });

  it('acaba sozinha na data marcada', async () => {
    const admin = await criarAdmin();
    const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
    const ana = await criarConta('Ana Teixeira');
    await criarProduto(abel.token, 'Kiwi');
    await denunciar(abel, ana);
    await decidir(abel, admin, {
      decisao: 'suspensao',
      motivo: 'Teste',
      ate: daquiA(1),
    });
    assert.deepEqual((await pedir('GET', '/products')).dados, []);

    // A data passa: a loja volta logo a mostrá-lo, mesmo antes de o ciclo tirar o castigo guardado
    await User.updateOne(
      { _id: abel.id },
      { 'castigo.ate': new Date(Date.now() - 1000) },
    );
    const logo = await pedir('GET', '/products');
    const tirado = await tirarCastigo(null, abel.id, { noFimDoPrazo: true });
    const guardado = await User.findById(abel.id);

    assert.equal(logo.dados.length, 1);
    assert.equal(tirado, true);
    assert.equal(guardado.castigo, undefined);
    assert.equal(
      (await textos(abel)).at(-1),
      'A suspensão da sua conta de produtor terminou. Os seus produtos e a sua página voltaram à loja.',
    );
  });
});
