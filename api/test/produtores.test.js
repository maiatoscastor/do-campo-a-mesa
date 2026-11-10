import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { apagarImagem, dimensoesDaImagem } from '../src/utils/imagens.js';

const PASSWORD = 'uma-password-de-teste';

let servidor;
let base;

// Base de dados à parte, como nos outros testes (os ficheiros de teste correm um de cada vez)
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  await User.init();
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

// Apaga também as imagens que os testes deixaram na pasta uploads
async function limpar() {
  for (const { produtor } of await User.find({ produtor: { $exists: true } })) {
    await apagarImagem(produtor.capaUrl);
    await apagarImagem(produtor.logotipoUrl);
  }
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
  const formulario = corpo instanceof FormData;
  const resposta = await fetch(`${base}/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo === undefined || formulario
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formulario || corpo === undefined ? corpo : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return { estado: resposta.status, dados: texto ? JSON.parse(texto) : null };
}

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

// Um PNG só com o cabeçalho, com a largura e a altura pedidas: o servidor só lê o cabeçalho
function png(largura, altura) {
  const conteudo = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(conteudo, 0);
  conteudo.writeUInt32BE(13, 8);
  conteudo.write('IHDR', 12, 'latin1');
  conteudo.writeUInt32BE(largura, 16);
  conteudo.writeUInt32BE(altura, 20);
  conteudo[24] = 8;
  conteudo[25] = 2;
  return conteudo;
}

function imagem(conteudo) {
  const formulario = new FormData();
  formulario.append(
    'imagem',
    new Blob([conteudo], { type: 'image/png' }),
    'x.png',
  );
  return formulario;
}

describe('página do produtor', () => {
  it('a página pública mostra só os dados públicos de um produtor aprovado', async () => {
    const abel = await criarConta('Quinta do Abel');
    const pendente = await criarConta('Quinta Pendente', { aprovado: false });

    const { estado, dados } = await pedir('GET', `/producers/${abel.id}`);
    const daPendente = await pedir('GET', `/producers/${pendente.id}`);
    const malFormado = await pedir('GET', '/producers/xpto');

    assert.equal(estado, 200);
    assert.equal(dados.nomeExploracao, 'Quinta do Abel');
    assert.equal(dados.localizacao.nomeConcelho, 'Ponte de Lima');
    assert.ok(dados.desde);
    assert.equal(dados.email, undefined);
    assert.equal(dados.validacao, undefined);
    assert.equal(daPendente.estado, 404);
    assert.equal(malFormado.estado, 400);
  });

  it('o produtor muda a sua página, e um campo vazio tira o que lá estava', async () => {
    const abel = await criarConta('Quinta do Abel');
    const mudar = (corpo) =>
      pedir('PATCH', '/producers/eu', { token: abel.token, corpo });

    const mudada = await mudar({
      descricao: 'Kiwis e vinho desde 1987.',
      levantamento: {
        dias: [6, 7],
        abre: '09:00',
        fecha: '13:00',
        nota: 'Tocar à campainha',
      },
      contactos: {
        telefone: '912 345 678',
        site: 'https://quintadoabel.pt',
        instagram: '@quinta.do.abel',
        facebook: 'https://www.facebook.com/quintadoabel',
      },
      ponto: { lat: 41.77, lng: -8.58 },
    });
    const semContactos = await mudar({ contactos: null, ponto: null });

    assert.equal(mudada.estado, 200);
    assert.equal(mudada.dados.validacao, 'aprovado');
    assert.deepEqual(mudada.dados.levantamento.dias, [6, 7]);
    assert.equal(mudada.dados.contactos.instagram, 'quinta.do.abel');
    assert.deepEqual(mudada.dados.ponto, { lat: 41.77, lng: -8.58 });
    assert.equal(semContactos.dados.contactos, undefined);
    assert.equal(semContactos.dados.ponto, undefined);
    assert.equal(semContactos.dados.descricao, 'Kiwis e vinho desde 1987.');
  });

  it('valida o horário, os contactos e o ponto, e ignora o que não se pode mudar', async () => {
    const pendente = await criarConta('Quinta Nova', { aprovado: false });

    const invalida = await pedir('PATCH', '/producers/eu', {
      token: pendente.token,
      corpo: {
        levantamento: { dias: [], abre: '13:00', fecha: '09:00' },
        contactos: { telefone: 'abc', site: 'quinta.pt' },
        ponto: { lat: 48.85, lng: 2.35 },
      },
    });
    await pedir('PATCH', '/producers/eu', {
      token: pendente.token,
      corpo: { validacao: 'aprovado', papel: 'admin' },
    });
    const conta = await User.findById(pendente.id);

    assert.equal(invalida.estado, 400);
    assert.deepEqual(Object.keys(invalida.dados.detalhes).sort(), [
      'dias',
      'fecha',
      'lat',
      'lng',
      'site',
      'telefone',
    ]);
    assert.equal(conta.produtor.validacao, 'pendente');
    assert.equal(conta.papel, 'produtor');
  });

  it('só um produtor muda a sua página', async () => {
    const ana = await criarConta('Ana', { papel: 'comprador' });

    const semSessao = await pedir('PATCH', '/producers/eu', { corpo: {} });
    const daCompradora = await pedir('PATCH', '/producers/eu', {
      token: ana.token,
      corpo: {},
    });

    assert.equal(semSessao.estado, 401);
    assert.equal(daCompradora.estado, 403);
  });

  it('a capa e o logótipo têm de ter o tamanho mínimo, e trocam-se e tiram-se', async () => {
    const abel = await criarConta('Quinta do Abel');
    const enviar = (caminho, conteudo) =>
      pedir('PUT', `/producers/eu/${caminho}`, {
        token: abel.token,
        corpo: imagem(conteudo),
      });

    const capaPequena = await enviar('capa', png(800, 300));
    const capa = await enviar('capa', png(1600, 500));
    const logotipoPequeno = await enviar('logotipo', png(100, 100));
    const logotipo = await enviar('logotipo', png(400, 400));
    const servida = await fetch(`${base}${capa.dados.capaUrl}`);
    const semCapa = await pedir('DELETE', '/producers/eu/capa', {
      token: abel.token,
    });
    const apagada = await fetch(`${base}${capa.dados.capaUrl}`);

    assert.equal(capaPequena.estado, 400);
    assert.equal(
      capaPequena.dados.erro,
      'A imagem tem de ter pelo menos 1200 × 300 px',
    );
    assert.equal(capa.estado, 200);
    // O editor usa a resposta como a nova página, por isso tem de trazer o estado da validação
    assert.equal(capa.dados.validacao, 'aprovado');
    assert.equal(semCapa.dados.validacao, 'aprovado');
    assert.equal(logotipoPequeno.estado, 400);
    assert.equal(logotipo.estado, 200);
    assert.equal(servida.status, 200);
    assert.equal(semCapa.dados.capaUrl, undefined);
    assert.ok(semCapa.dados.logotipoUrl);
    assert.equal(apagada.status, 404);
  });
});

describe('dimensões das imagens', () => {
  it('lê a largura e a altura do cabeçalho de um JPEG, de um PNG e de um WebP', () => {
    // JPEG: início, um bloco APP0 de 16 bytes e o início do fotograma (SOF0) com 600 × 1600
    const jpeg = Buffer.from(
      'ffd8' +
        'ffe00010' +
        '00'.repeat(14) +
        'ffc00011' +
        '08' +
        '0258' +
        '0640' +
        '03',
      'hex',
    );
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'latin1');
    webp.write('WEBP', 8, 'latin1');
    webp.write('VP8X', 12, 'latin1');
    webp.writeUIntLE(1599, 24, 3);
    webp.writeUIntLE(499, 27, 3);

    assert.deepEqual(dimensoesDaImagem(jpeg), { largura: 1600, altura: 600 });
    assert.deepEqual(dimensoesDaImagem(png(1600, 500)), {
      largura: 1600,
      altura: 500,
    });
    assert.deepEqual(dimensoesDaImagem(webp), { largura: 1600, altura: 500 });
    assert.equal(dimensoesDaImagem(Buffer.from('nada disto é imagem')), null);
  });
});
