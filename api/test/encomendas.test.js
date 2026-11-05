import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
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
  // As coleções têm de existir antes das transações que escrevem nelas
  await Promise.all([User.init(), Product.init(), Order.init()]);
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Order.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});
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
async function criarConta(nome, { papel = 'produtor', aprovado = true } = {}) {
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

async function criarProduto(token, nome, preco, stock) {
  const { dados } = await pedir('POST', '/products', {
    token,
    corpo: { nome, categoria: 'Outros', preco, unidade: 'kg', stock },
  });
  return dados.id;
}

async function stockDe(id) {
  return (await Product.findById(id)).stock;
}

describe('encomendar', () => {
  it('cria uma encomenda por produtor, com os preços do servidor, e desce o stock', async () => {
    const abel = await criarConta('Quinta do Abel');
    const graca = await criarConta('Horta da Graca');
    const comprador = await criarConta('Ana', { papel: 'comprador' });
    const mel = await criarProduto(abel.token, 'Mel', 8.5, 10);
    const kiwi = await criarProduto(abel.token, 'Kiwi', 2.9, 5);
    const grelos = await criarProduto(graca.token, 'Grelos', 1.8, 3);

    const { estado, dados } = await pedir('POST', '/orders', {
      token: comprador.token,
      corpo: {
        linhas: [
          { produto: mel, quantidade: 2, preco: 0.01 },
          { produto: grelos, quantidade: 1 },
          { produto: kiwi, quantidade: 3 },
        ],
        modo: 'levantamento',
      },
    });

    assert.equal(estado, 201);
    assert.equal(dados.length, 2);
    const doAbel = dados.find((e) => e.produtor === abel.id);
    assert.deepEqual(
      doAbel.linhas.map(({ nome, preco, quantidade }) => [
        nome,
        preco,
        quantidade,
      ]),
      [
        ['Mel', 8.5, 2],
        ['Kiwi', 2.9, 3],
      ],
    );
    // 8,50 × 2 + 2,90 × 3, sem erros de arredondamento
    assert.equal(doAbel.total, 25.7);
    assert.equal(doAbel.estado, 'pendente');
    assert.equal(doAbel.historico[0].estado, 'pendente');
    assert.equal(dados.find((e) => e.produtor === graca.id).total, 1.8);
    assert.deepEqual(
      [await stockDe(mel), await stockDe(kiwi), await stockDe(grelos)],
      [8, 2, 2],
    );
  });

  it('é tudo ou nada: se faltar stock de um produto, nenhum stock muda', async () => {
    const produtor = await criarConta('Quinta do Stock');
    const comprador = await criarConta('Rui', { papel: 'comprador' });
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 10);
    const vinho = await criarProduto(produtor.token, 'Vinho', 7.5, 1);

    const { estado, dados } = await pedir('POST', '/orders', {
      token: comprador.token,
      corpo: {
        linhas: [
          { produto: mel, quantidade: 2 },
          { produto: vinho, quantidade: 2 },
        ],
        modo: 'levantamento',
      },
    });

    assert.equal(estado, 409);
    assert.equal(dados.erro, 'Só restam 1 de "Vinho"');
    assert.equal(await stockDe(mel), 10);
    assert.equal(await stockDe(vinho), 1);
    assert.equal(await Order.countDocuments(), 0);
  });

  it('com encomendas ao mesmo tempo, nunca vende mais do que o stock', async () => {
    const produtor = await criarConta('Quinta Concorrida');
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 3);
    const compradores = [];
    for (let i = 0; i < 6; i += 1) {
      compradores.push(
        await criarConta(`Comprador ${i}`, { papel: 'comprador' }),
      );
    }

    const respostas = await Promise.all(
      compradores.map(({ token }) =>
        pedir('POST', '/orders', {
          token,
          corpo: {
            linhas: [{ produto: mel, quantidade: 1 }],
            modo: 'levantamento',
          },
        }),
      ),
    );

    const estados = respostas.map(({ estado }) => estado).sort();
    assert.deepEqual(estados, [201, 201, 201, 409, 409, 409]);
    assert.equal(await stockDe(mel), 0);
    assert.equal(await Order.countDocuments(), 3);
  });

  it('valida o pedido antes de mexer no stock', async () => {
    const produtor = await criarConta('Quinta Valida');
    const comprador = await criarConta('Eva', { papel: 'comprador' });
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 10);
    const encomendar = (corpo) =>
      pedir('POST', '/orders', { token: comprador.token, corpo });

    const vazia = await encomendar({ linhas: [], modo: 'levantamento' });
    assert.equal(vazia.estado, 400);
    for (const linha of [
      { produto: mel, quantidade: 0 },
      { produto: mel, quantidade: 1.5 },
      { produto: { $gt: '' }, quantidade: 1 },
      null,
    ]) {
      const { estado } = await encomendar({ linhas: [linha], modo: 'entrega' });
      assert.equal(estado, 400);
    }
    const semMorada = await encomendar({
      linhas: [{ produto: mel, quantidade: 1 }],
      modo: 'entrega',
      morada: '   ',
    });
    assert.equal(semMorada.estado, 400);
    assert.equal(
      semMorada.dados.detalhes.morada,
      'Indique a morada de entrega',
    );
    const semModo = await encomendar({
      linhas: [{ produto: mel, quantidade: 1 }],
      modo: 'correio',
    });
    assert.equal(
      semModo.dados.detalhes.modo,
      'Escolha levantamento ou entrega',
    );
    assert.equal(await stockDe(mel), 10);
  });

  it('guarda a morada nas entregas', async () => {
    const produtor = await criarConta('Quinta Entrega');
    const comprador = await criarConta('Lia', { papel: 'comprador' });
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 10);

    const { estado, dados } = await pedir('POST', '/orders', {
      token: comprador.token,
      corpo: {
        linhas: [{ produto: mel, quantidade: 1 }],
        modo: 'entrega',
        morada: ' Rua do Souto, 12, Ponte de Lima ',
      },
    });

    assert.equal(estado, 201);
    assert.equal(dados[0].morada, 'Rua do Souto, 12, Ponte de Lima');
  });

  it('exige sessão, não vende produtos de produtores por aprovar, nem ao próprio produtor', async () => {
    const produtor = await criarConta('Quinta Propria');
    const pendente = await criarConta('Quinta Por Aprovar', {
      aprovado: false,
    });
    const comprador = await criarConta('Teo', { papel: 'comprador' });
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 10);
    const escondido = await Product.create({
      nome: 'Escondido',
      categoria: 'Outros',
      preco: 1,
      unidade: 'kg',
      stock: 10,
      produtor: pendente.id,
    });
    const corpo = (produto) => ({
      linhas: [{ produto, quantidade: 1 }],
      modo: 'levantamento',
    });

    const semSessao = await pedir('POST', '/orders', { corpo: corpo(mel) });
    const proprio = await pedir('POST', '/orders', {
      token: produtor.token,
      corpo: corpo(mel),
    });
    const porAprovar = await pedir('POST', '/orders', {
      token: comprador.token,
      corpo: corpo(escondido.id),
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(proprio.estado, 400);
    assert.equal(porAprovar.estado, 409);
    assert.equal(await stockDe(mel), 10);
  });

  it('um produtor também pode comprar a outro produtor', async () => {
    const vendedor = await criarConta('Quinta Vendedora');
    const outro = await criarConta('Quinta Compradora');
    const mel = await criarProduto(vendedor.token, 'Mel', 8.5, 10);

    const { estado } = await pedir('POST', '/orders', {
      token: outro.token,
      corpo: {
        linhas: [{ produto: mel, quantidade: 1 }],
        modo: 'levantamento',
      },
    });

    assert.equal(estado, 201);
  });
});

describe('acompanhar as encomendas', () => {
  // Uma encomenda de 1 kg de mel feita pela Ana à Quinta do Abel
  async function umaEncomenda() {
    const produtor = await criarConta('Quinta do Abel');
    const comprador = await criarConta('Ana', { papel: 'comprador' });
    const mel = await criarProduto(produtor.token, 'Mel', 8.5, 10);
    const { dados } = await pedir('POST', '/orders', {
      token: comprador.token,
      corpo: {
        linhas: [{ produto: mel, quantidade: 1 }],
        modo: 'levantamento',
      },
    });
    return { produtor, comprador, encomenda: dados[0] };
  }

  it('cada um vê as suas: o comprador as que fez, o produtor as que recebeu', async () => {
    const { produtor, comprador, encomenda } = await umaEncomenda();
    const outro = await criarConta('Quinta Alheia');
    const outroComprador = await criarConta('Rita', { papel: 'comprador' });

    const feitas = await pedir('GET', '/orders', { token: comprador.token });
    const recebidas = await pedir('GET', '/orders/recebidas', {
      token: produtor.token,
    });

    assert.deepEqual(
      feitas.dados.map(({ id }) => id),
      [encomenda.id],
    );
    assert.equal(feitas.dados[0].produtor.nomeExploracao, 'Quinta do Abel');
    assert.equal(
      feitas.dados[0].produtor.localizacao.nomeConcelho,
      'Ponte de Lima',
    );
    assert.equal(recebidas.dados[0].comprador.nome, 'Ana');
    assert.equal(recebidas.dados[0].comprador.email, 'ana@teste.pt');
    assert.deepEqual(
      (await pedir('GET', '/orders', { token: outroComprador.token })).dados,
      [],
    );
    assert.deepEqual(
      (await pedir('GET', '/orders/recebidas', { token: outro.token })).dados,
      [],
    );
    assert.equal(
      (await pedir('GET', '/orders/recebidas', { token: comprador.token }))
        .estado,
      403,
    );
  });

  it('o produtor passa a encomenda ao estado seguinte, um de cada vez', async () => {
    const { produtor, encomenda } = await umaEncomenda();
    const mudar = (estado) =>
      pedir('PATCH', `/orders/${encomenda.id}/estado`, {
        token: produtor.token,
        corpo: { estado },
      });

    assert.equal((await mudar('pronta')).estado, 409);
    const confirmada = await mudar('confirmada');
    assert.equal(confirmada.estado, 200);
    assert.equal(confirmada.dados.estado, 'confirmada');
    assert.equal(confirmada.dados.comprador.nome, 'Ana');
    assert.equal((await mudar('confirmada')).estado, 409);
    assert.equal((await mudar('pronta')).estado, 200);
    const entregue = await mudar('entregue');
    assert.deepEqual(
      entregue.dados.historico.map(({ estado }) => estado),
      ['pendente', 'confirmada', 'pronta', 'entregue'],
    );
    assert.equal(
      (await mudar('entregue')).dados.erro,
      'A encomenda já foi entregue',
    );
    assert.equal((await mudar('xpto')).estado, 400);
  });

  it('só o produtor da encomenda lhe muda o estado', async () => {
    const { comprador, encomenda } = await umaEncomenda();
    const outro = await criarConta('Quinta Alheia');
    const corpo = { estado: 'confirmada' };

    const deOutro = await pedir('PATCH', `/orders/${encomenda.id}/estado`, {
      token: outro.token,
      corpo,
    });
    const doComprador = await pedir('PATCH', `/orders/${encomenda.id}/estado`, {
      token: comprador.token,
      corpo,
    });
    const inexistente = await pedir(
      'PATCH',
      `/orders/${new mongoose.Types.ObjectId()}/estado`,
      { token: outro.token, corpo },
    );
    const malFormado = await pedir('PATCH', '/orders/xpto/estado', {
      token: outro.token,
      corpo,
    });

    assert.equal(deOutro.estado, 403);
    assert.equal(doComprador.estado, 403);
    assert.equal(inexistente.estado, 404);
    assert.equal(malFormado.estado, 400);
    assert.equal((await Order.findById(encomenda.id)).estado, 'pendente');
  });
});
