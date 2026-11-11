import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Notification } from '../src/models/Notification.js';
import { Order } from '../src/models/Order.js';
import { Product } from '../src/models/Product.js';
import { Report } from '../src/models/Report.js';
import { Review } from '../src/models/Review.js';
import { User } from '../src/models/User.js';
import { cifrarPassword } from '../src/utils/password.js';

const PASSWORD = 'uma-password-de-teste';

let servidor;
let base;

// Base de dados à parte, como nos outros testes (os ficheiros de teste correm um de cada vez)
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  // As coleções (e os índices únicos) têm de existir antes dos testes
  await Promise.all(
    [User, Product, Order, Review, Report, Notification].map((modelo) =>
      modelo.init(),
    ),
  );
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

async function limpar() {
  await Promise.all(
    [Report, Review, Notification, Order, Product, User].map((modelo) =>
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

// Regista uma conta pela API; os produtores ficam aprovados
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

// Os administradores só se criam no terminal: aqui, diretamente na base de dados
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
  return { id: dados.utilizador.id, token: dados.token };
}

// Uma encomenda entregue de um kiwi, avaliada pelo comprador
async function avaliacaoDe(comprador, produtor, produto, classificacao) {
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
  const { dados: avaliacao } = await pedir('POST', '/reviews', {
    token: comprador.token,
    corpo: { encomenda, classificacao, comentario: 'Um comentário.' },
  });
  return avaliacao.id;
}

// Um produtor com um produto, duas compradoras e um comprador; a Ana e o Rui já avaliaram
async function cenario() {
  const abel = await criarConta('Quinta do Abel', { papel: 'produtor' });
  const ana = await criarConta('Ana Maria Teixeira');
  const rui = await criarConta('Rui Costa');
  const mia = await criarConta('Mia Sousa');
  const { dados: kiwi } = await pedir('POST', '/products', {
    token: abel.token,
    corpo: {
      nome: 'Kiwi',
      categoria: 'Fruta',
      preco: 2,
      unidade: 'kg',
      stock: 50,
    },
  });
  const daAna = await avaliacaoDe(ana, abel, kiwi.id, 5);
  const doRui = await avaliacaoDe(rui, abel, kiwi.id, 1);
  return { abel, ana, rui, mia, daAna, doRui };
}

function denunciar(token, avaliacao, corpo = { motivo: 'ofensiva' }) {
  return pedir('POST', `/reviews/${avaliacao}/denuncias`, { token, corpo });
}

function moderar(token, avaliacao, corpo) {
  return pedir('PATCH', `/admin/avaliacoes/${avaliacao}/moderacao`, {
    token,
    corpo,
  });
}

// As notificações de uma pessoa sobre denúncias, das mais recentes para as mais antigas
async function sobreDenuncias(conta) {
  const { dados } = await pedir('GET', '/notifications', {
    token: conta.token,
  });
  return dados.notificacoes
    .filter(({ tipo }) => tipo === 'denuncia')
    .map(({ texto }) => texto);
}

describe('denunciar uma avaliação', () => {
  it('quem tem sessão denuncia uma vez, com um motivo; o autor não denuncia a sua', async () => {
    const { abel, ana, rui, doRui } = await cenario();

    const semSessao = await pedir('POST', `/reviews/${doRui}/denuncias`, {
      corpo: { motivo: 'ofensiva' },
    });
    const doAutor = await denunciar(rui.token, doRui);
    const semMotivo = await denunciar(ana.token, doRui, {});
    const outroSemTexto = await denunciar(ana.token, doRui, {
      motivo: 'outro',
    });
    const inexistente = await denunciar(ana.token, '0123456789abcdef01234567');
    // Duas vezes ao mesmo tempo: o índice único deixa passar uma só
    const aoMesmoTempo = await Promise.all([
      denunciar(ana.token, doRui, { motivo: 'dados-pessoais' }),
      denunciar(ana.token, doRui, { motivo: 'dados-pessoais' }),
    ]);
    const doProdutor = await denunciar(abel.token, doRui, {
      motivo: 'falsa',
      descricao: '  Esta encomenda correu bem.  ',
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(doAutor.estado, 403);
    assert.equal(semMotivo.estado, 400);
    assert.equal(semMotivo.dados.detalhes.motivo, 'Escolha um motivo');
    assert.equal(outroSemTexto.estado, 400);
    assert.equal(
      outroSemTexto.dados.detalhes.descricao,
      'Conte o que se passa',
    );
    assert.equal(inexistente.estado, 404);
    assert.deepEqual(
      aoMesmoTempo.map(({ estado }) => estado).sort(),
      [201, 409],
    );
    assert.equal(doProdutor.estado, 201);
    assert.equal(doProdutor.dados.estado, 'pendente');
    assert.equal(doProdutor.dados.descricao, 'Esta encomenda correu bem.');
    assert.equal(await Report.countDocuments(), 2);
  });

  it('a avaliação continua visível, e cada pessoa sabe quais já denunciou', async () => {
    const { abel, ana, rui, doRui, daAna } = await cenario();
    await denunciar(ana.token, doRui);

    const lista = (token) =>
      pedir('GET', `/reviews?produtor=${abel.id}`, { token });
    const daAnaVe = await lista(ana.token);
    const doRuiVe = await lista(rui.token);
    const visitante = await lista();
    const comTokenEstragado = await lista('nao-e-um-token');
    const marcadas = ({ dados }) =>
      Object.fromEntries(dados.avaliacoes.map((a) => [a.id, a.denunciada]));

    assert.equal(daAnaVe.dados.resumo.total, 2);
    assert.deepEqual(marcadas(daAnaVe), { [doRui]: true, [daAna]: false });
    assert.deepEqual(marcadas(doRuiVe), { [doRui]: false, [daAna]: false });
    assert.deepEqual(marcadas(visitante), {
      [doRui]: undefined,
      [daAna]: undefined,
    });
    // Um token que já não serve não estraga uma página aberta a todos
    assert.equal(comTokenEstragado.estado, 200);
  });

  it('os administradores são avisados só da primeira denúncia de cada avaliação', async () => {
    const admin = await criarAdmin();
    const { abel, ana, mia, doRui } = await cenario();

    await denunciar(ana.token, doRui);
    await denunciar(mia.token, doRui);
    await denunciar(abel.token, doRui);
    const { dados: resumo } = await pedir('GET', '/admin/resumo', {
      token: admin.token,
    });

    assert.deepEqual(await sobreDenuncias(admin), [
      'Nova denúncia de uma avaliação a Quinta do Abel.',
    ]);
    assert.deepEqual(resumo, {
      produtoresPorValidar: 0,
      denunciasPorDecidir: 1,
      denunciasDeAvaliacoes: 1,
      denunciasDeProdutores: 0,
    });
  });
});

describe('moderar as avaliações denunciadas', () => {
  it('só o administrador vê e decide', async () => {
    const { ana, doRui } = await cenario();
    await denunciar(ana.token, doRui);

    const semSessao = await pedir('GET', '/admin/resumo');
    const lista = await pedir('GET', '/admin/denuncias', { token: ana.token });
    const decidir = await moderar(ana.token, doRui, {
      decisao: 'ocultada',
      motivo: 'Não gosto.',
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(lista.estado, 403);
    assert.equal(decidir.estado, 403);
    assert.equal((await Review.findById(doRui)).visivel, true);
  });

  it('a lista mostra cada avaliação uma vez, com as denúncias e quem as fez', async () => {
    const admin = await criarAdmin();
    const { abel, ana, doRui, daAna } = await cenario();
    await denunciar(ana.token, doRui, { motivo: 'dados-pessoais' });
    await denunciar(abel.token, doRui, {
      motivo: 'outro',
      descricao: 'Não é verdade.',
    });
    await denunciar(abel.token, daAna, { motivo: 'publicidade' });

    const { dados } = await pedir('GET', '/admin/denuncias', {
      token: admin.token,
    });

    assert.equal(dados.porDecidir, 2);
    // Primeiro a que espera há mais tempo
    assert.deepEqual(
      dados.casos.map(({ avaliacao }) => avaliacao.id),
      [doRui, daAna],
    );
    const [caso] = dados.casos;
    assert.equal(caso.avaliacao.autor.nome, 'Rui Costa');
    assert.equal(caso.avaliacao.produtor.nomeExploracao, 'Quinta do Abel');
    assert.deepEqual(
      caso.denuncias.map(({ motivo, autor }) => [motivo, autor.eOProdutor]),
      [
        ['dados-pessoais', false],
        ['outro', true],
      ],
    );
  });

  it('ocultar tira a avaliação da lista e da média, e avisa quem a escreveu e quem a denunciou', async () => {
    const admin = await criarAdmin();
    const { abel, ana, rui, mia, doRui } = await cenario();
    await denunciar(ana.token, doRui, { motivo: 'dados-pessoais' });
    await denunciar(abel.token, doRui, { motivo: 'falsa' });

    const semMotivo = await moderar(admin.token, doRui, {
      decisao: 'ocultada',
      motivo: '  ',
    });
    const semDecisao = await moderar(admin.token, doRui, {
      decisao: 'apagada',
      motivo: 'Tem um telefone.',
    });
    const ocultada = await moderar(admin.token, doRui, {
      decisao: 'ocultada',
      motivo: 'Tem um telefone.',
    });

    assert.equal(semMotivo.estado, 400);
    assert.equal(
      semMotivo.dados.detalhes.motivo,
      'Escreva o motivo da decisão',
    );
    assert.equal(semDecisao.estado, 400);
    assert.ok(semDecisao.dados.detalhes.decisao);
    assert.equal(ocultada.estado, 200);
    assert.equal(ocultada.dados.avaliacao.visivel, false);
    assert.deepEqual(
      ocultada.dados.denuncias.map(({ estado, decisao }) => [estado, decisao]),
      [
        ['decidida', 'ocultada'],
        ['decidida', 'ocultada'],
      ],
    );

    // Sai da lista pública e da média: fica só a de 5 estrelas da Ana
    const { dados: publica } = await pedir(
      'GET',
      `/reviews?produtor=${abel.id}`,
    );
    assert.deepEqual([publica.resumo.media, publica.resumo.total], [5, 1]);
    assert.deepEqual(await sobreDenuncias(rui), [
      'A sua avaliação a Quinta do Abel foi ocultada pelo administrador. Motivo: Tem um telefone.',
    ]);
    for (const quem of [ana, abel]) {
      assert.deepEqual(await sobreDenuncias(quem), [
        'A avaliação a Quinta do Abel que denunciou foi ocultada. Motivo: Tem um telefone.',
      ]);
    }

    // Quem a escreveu vê porquê, mas já não a muda; o produtor já não lhe responde
    const vista = await pedir('GET', `/reviews/${doRui}`, { token: rui.token });
    const mudar = await pedir('PUT', `/reviews/${doRui}`, {
      token: rui.token,
      corpo: { classificacao: 2 },
    });
    const responder = await pedir('PUT', `/reviews/${doRui}/resposta`, {
      token: abel.token,
      corpo: { texto: 'Obrigado.' },
    });
    const denunciarOculta = await denunciar(mia.token, doRui);
    const { dados: encomendas } = await pedir('GET', '/orders', {
      token: rui.token,
    });
    assert.equal(vista.dados.visivel, false);
    assert.equal(vista.dados.moderacao.motivo, 'Tem um telefone.');
    assert.equal(mudar.estado, 409);
    assert.equal(responder.estado, 409);
    assert.equal(denunciarOculta.estado, 404);
    assert.equal(encomendas[0].avaliacao.visivel, false);

    // Passa para as decididas
    const porDecidir = await pedir('GET', '/admin/denuncias', {
      token: admin.token,
    });
    const decididas = await pedir('GET', '/admin/denuncias?estado=decidida', {
      token: admin.token,
    });
    assert.deepEqual(porDecidir.dados.casos, []);
    assert.equal(porDecidir.dados.porDecidir, 0);
    assert.equal(decididas.dados.casos.length, 1);
    assert.equal(
      decididas.dados.casos[0].avaliacao.moderacao.decisao,
      'ocultada',
    );
  });

  it('manter avisa só quem denunciou, e o administrador pode voltar atrás', async () => {
    const admin = await criarAdmin();
    const { abel, ana, rui, doRui } = await cenario();
    await denunciar(ana.token, doRui);

    await moderar(admin.token, doRui, {
      decisao: 'mantida',
      motivo: 'É uma crítica honesta.',
    });
    assert.equal((await Review.findById(doRui)).visivel, true);
    assert.deepEqual(await sobreDenuncias(ana), [
      'A avaliação a Quinta do Abel que denunciou vai continuar visível. Motivo: É uma crítica honesta.',
    ]);
    assert.deepEqual(await sobreDenuncias(rui), []);

    // Mudar de ideias: ocultar e voltar a mostrar
    await moderar(admin.token, doRui, {
      decisao: 'ocultada',
      motivo: 'Afinal tem ofensas.',
    });
    await moderar(admin.token, doRui, {
      decisao: 'mantida',
      motivo: 'Revi e não tem.',
    });
    assert.equal((await Review.findById(doRui)).visivel, true);
    assert.deepEqual(await sobreDenuncias(rui), [
      'A sua avaliação a Quinta do Abel voltou a aparecer. Motivo: Revi e não tem.',
      'A sua avaliação a Quinta do Abel foi ocultada pelo administrador. Motivo: Afinal tem ofensas.',
    ]);
    // A Ana já tinha recebido a decisão: não volta a ser avisada
    assert.equal((await sobreDenuncias(ana)).length, 1);

    // Uma denúncia nova de uma avaliação já decidida volta a pô-la por decidir
    await denunciar(abel.token, doRui);
    const porDecidir = await pedir('GET', '/admin/denuncias', {
      token: admin.token,
    });
    const decididas = await pedir('GET', '/admin/denuncias?estado=decidida', {
      token: admin.token,
    });
    assert.deepEqual(
      porDecidir.dados.casos.map(({ denuncias }) => denuncias.length),
      [1],
    );
    assert.deepEqual(decididas.dados.casos, []);
  });
});

describe('produtores por validar', () => {
  it('os administradores são avisados de cada produtor novo', async () => {
    const admin = await criarAdmin();

    await pedir('POST', '/auth/registo', {
      corpo: {
        nome: 'Rosa Lima',
        email: 'rosa@teste.pt',
        password: PASSWORD,
        papel: 'produtor',
        nomeExploracao: 'Horta da Rosa',
        concelho: '1607',
        freguesia: '160704',
      },
    });
    await criarConta('Comprador Sem Aviso');
    const { dados: notificacoes } = await pedir('GET', '/notifications', {
      token: admin.token,
    });
    const { dados: resumo } = await pedir('GET', '/admin/resumo', {
      token: admin.token,
    });

    assert.deepEqual(
      notificacoes.notificacoes.map(({ texto, ligacao }) => [texto, ligacao]),
      [['Novo produtor por validar: Horta da Rosa.', '/admin/produtores']],
    );
    assert.equal(resumo.produtoresPorValidar, 1);
  });
});
