import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { apagarImagem } from '../src/utils/imagens.js';

const PASSWORD = 'uma-password-de-teste';
// Uma imagem PNG de 1×1 píxel
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const PRODUTO = {
  nome: 'Mel de urze',
  categoria: 'Mel',
  preco: 8.5,
  unidade: 'frasco 500 g',
  stock: 30,
};

let servidor;
let base;

// Base de dados à parte, como nos testes das contas (os ficheiros de teste correm um de cada vez)
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

// Apaga as fotografias que os testes deixaram na pasta uploads
async function limpar() {
  for (const { imagemUrl } of await Product.find({
    imagemUrl: { $exists: true },
  })) {
    await apagarImagem(imagemUrl);
  }
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
  return {
    estado: resposta.status,
    cabecalhos: resposta.headers,
    dados: texto ? JSON.parse(texto) : null,
  };
}

// Regista uma conta pela API e, se for pedido, aprova-a diretamente na base de dados
async function criarConta(
  nome,
  {
    papel = 'produtor',
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
      nomeExploracao: nome,
      concelho,
      freguesia,
    },
  });
  if (aprovado && papel === 'produtor') {
    await User.updateOne({ email }, { 'produtor.validacao': 'aprovado' });
  }
  return { id: dados.utilizador.id, token: dados.token };
}

function imagem(conteudo, tipo = 'image/png', nome = 'foto.png') {
  const formulario = new FormData();
  formulario.append('imagem', new Blob([conteudo], { type: tipo }), nome);
  return formulario;
}

describe('catálogo', () => {
  it('só mostra produtos de produtores aprovados, com os dados do produtor', async () => {
    const aprovado = await criarConta('Quinta Aprovada');
    const pendente = await criarConta('Quinta Pendente', { aprovado: false });
    await pedir('POST', '/products', { token: aprovado.token, corpo: PRODUTO });
    await Product.create({
      ...PRODUTO,
      nome: 'Escondido',
      produtor: pendente.id,
    });

    const { estado, dados } = await pedir('GET', '/products');

    assert.equal(estado, 200);
    assert.deepEqual(
      dados.map((p) => p.nome),
      ['Mel de urze'],
    );
    assert.equal(dados[0].produtor.nomeExploracao, 'Quinta Aprovada');
    assert.equal(dados[0].produtor.localizacao.nomeConcelho, 'Ponte de Lima');
  });

  it('filtra por categoria, época, biológico e preço', async () => {
    const { token } = await criarConta('Quinta dos Filtros');
    const produtos = [
      { ...PRODUTO, nome: 'Mel', preco: 8 },
      {
        ...PRODUTO,
        nome: 'Kiwi',
        categoria: 'Fruta',
        preco: 2.9,
        biologico: true,
        epocas: ['Outono', 'Inverno'],
      },
      {
        ...PRODUTO,
        nome: 'Cereja',
        categoria: 'Fruta',
        preco: 6,
        epocas: ['Primavera'],
      },
    ];
    for (const corpo of produtos) {
      await pedir('POST', '/products', { token, corpo });
    }
    const nomes = async (filtros) =>
      (await pedir('GET', `/products?${new URLSearchParams(filtros)}`)).dados
        .map((p) => p.nome)
        .sort();

    assert.deepEqual(await nomes({ categoria: 'Fruta' }), ['Cereja', 'Kiwi']);
    // Sem épocas quer dizer todo o ano, por isso o mel aparece no inverno
    assert.deepEqual(await nomes({ epoca: 'Inverno' }), ['Kiwi', 'Mel']);
    assert.deepEqual(await nomes({ biologico: 'true' }), ['Kiwi']);
    assert.deepEqual(await nomes({ precoMin: '3', precoMax: '7' }), ['Cereja']);
  });

  it('pesquisa pelo nome do produto ou do produtor, e filtra pelo concelho', async () => {
    const { token: deLima } = await criarConta('Horta do Rio');
    const { token: deMoncao } = await criarConta('Quinta do Monte', {
      concelho: '1604',
      freguesia: '160438',
    });
    await pedir('POST', '/products', {
      token: deLima,
      corpo: { ...PRODUTO, nome: 'Grelos', categoria: 'Hortícolas' },
    });
    await pedir('POST', '/products', {
      token: deMoncao,
      corpo: { ...PRODUTO, nome: 'Alvarinho', categoria: 'Vinho' },
    });
    const nomes = async (filtros) =>
      (
        await pedir('GET', `/products?${new URLSearchParams(filtros)}`)
      ).dados.map((p) => p.nome);

    assert.deepEqual(await nomes({ q: 'grel' }), ['Grelos']);
    assert.deepEqual(await nomes({ q: 'horta do' }), ['Grelos']);
    assert.deepEqual(await nomes({ q: 'a.b(' }), []);
    assert.deepEqual(await nomes({ concelho: '1604' }), ['Alvarinho']);
  });

  it('lista só os produtores aprovados', async () => {
    await criarConta('Quinta Aprovada');
    await criarConta('Quinta Pendente', { aprovado: false });

    const { dados } = await pedir('GET', '/producers');

    assert.deepEqual(
      dados.map((p) => p.nomeExploracao),
      ['Quinta Aprovada'],
    );
  });

  it('para os filtros, lista só os produtores com produtos', async () => {
    const { token } = await criarConta('Quinta Com Produtos');
    await criarConta('Quinta Sem Produtos');
    await pedir('POST', '/products', { token, corpo: PRODUTO });

    const { dados } = await pedir('GET', '/producers?comProdutos=true');

    assert.deepEqual(
      dados.map((p) => p.nomeExploracao),
      ['Quinta Com Produtos'],
    );
  });
});

describe('gestão dos produtos', () => {
  it('cria com 201 e o endereço no cabeçalho Location', async () => {
    const { token } = await criarConta('Quinta Nova');

    const { estado, cabecalhos, dados } = await pedir('POST', '/products', {
      token,
      corpo: PRODUTO,
    });

    assert.equal(estado, 201);
    assert.equal(cabecalhos.get('location'), `/api/products/${dados.id}`);
    const lido = await pedir('GET', `/products/${dados.id}`);
    assert.equal(lido.dados.nome, 'Mel de urze');
  });

  it('só deixa criar a produtores aprovados', async () => {
    const comprador = await criarConta('Comprador', { papel: 'comprador' });
    const pendente = await criarConta('Quinta Pendente', { aprovado: false });

    const semToken = await pedir('POST', '/products', { corpo: PRODUTO });
    const deComprador = await pedir('POST', '/products', {
      token: comprador.token,
      corpo: PRODUTO,
    });
    const dePendente = await pedir('POST', '/products', {
      token: pendente.token,
      corpo: PRODUTO,
    });

    assert.equal(semToken.estado, 401);
    assert.equal(deComprador.estado, 403);
    assert.equal(dePendente.estado, 403);
  });

  it('valida os dados e ignora os campos que não são permitidos', async () => {
    const { token, id } = await criarConta('Quinta Nova');

    const invalido = await pedir('POST', '/products', {
      token,
      corpo: { nome: '', categoria: 'Peixe', preco: 2.999, stock: 1.5 },
    });
    const outro = await criarConta('Outra Quinta');
    const certo = await pedir('POST', '/products', {
      token,
      corpo: {
        ...PRODUTO,
        produtor: outro.id,
        exemplo: true,
        imagemUrl: '/uploads/x.png',
      },
    });

    assert.equal(invalido.estado, 400);
    assert.deepEqual(Object.keys(invalido.dados.detalhes).sort(), [
      'categoria',
      'nome',
      'preco',
      'stock',
      'unidade',
    ]);
    assert.equal(certo.dados.produtor, id);
    assert.equal(certo.dados.exemplo, false);
    assert.equal(certo.dados.imagemUrl, undefined);
  });

  it('só o dono edita e apaga; apagar responde 204', async () => {
    const dono = await criarConta('Quinta do Dono');
    const outro = await criarConta('Outra Quinta');
    const { dados: produto } = await pedir('POST', '/products', {
      token: dono.token,
      corpo: PRODUTO,
    });
    const caminho = `/products/${produto.id}`;

    const deOutro = await pedir('PUT', caminho, {
      token: outro.token,
      corpo: PRODUTO,
    });
    const editado = await pedir('PUT', caminho, {
      token: dono.token,
      corpo: { ...PRODUTO, preco: 9 },
    });
    const apagadoPorOutro = await pedir('DELETE', caminho, {
      token: outro.token,
    });
    const apagado = await pedir('DELETE', caminho, { token: dono.token });
    const depois = await pedir('GET', caminho);

    assert.equal(deOutro.estado, 403);
    assert.equal(editado.estado, 200);
    assert.equal(editado.dados.preco, 9);
    assert.equal(apagadoPorOutro.estado, 403);
    assert.equal(apagado.estado, 204);
    assert.equal(depois.estado, 404);
  });

  it('dá 404 a um produto que não existe e 400 a um identificador mal formado', async () => {
    const { token } = await criarConta('Quinta Nova');

    const inexistente = await pedir(
      'PUT',
      `/products/${new mongoose.Types.ObjectId()}`,
      { token, corpo: PRODUTO },
    );
    const malFormado = await pedir('GET', '/products/nao-e-um-id');

    assert.equal(inexistente.estado, 404);
    assert.equal(malFormado.estado, 400);
  });
});

describe('fotografias', () => {
  it('guarda, serve, troca e tira a fotografia', async () => {
    const { token } = await criarConta('Quinta das Fotos');
    const { dados: produto } = await pedir('POST', '/products', {
      token,
      corpo: PRODUTO,
    });
    const caminho = `/products/${produto.id}/imagem`;

    const primeira = await pedir('PUT', caminho, { token, corpo: imagem(PNG) });
    const servida = await fetch(`${base}${primeira.dados.imagemUrl}`);
    const segunda = await pedir('PUT', caminho, { token, corpo: imagem(PNG) });
    const antiga = await fetch(`${base}${primeira.dados.imagemUrl}`);
    const tirada = await pedir('DELETE', caminho, { token });
    const depois = await fetch(`${base}${segunda.dados.imagemUrl}`);

    assert.match(primeira.dados.imagemUrl, /^\/uploads\/[\w-]+\.png$/);
    assert.equal(servida.status, 200);
    assert.equal(servida.headers.get('content-type'), 'image/png');
    assert.equal(servida.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(antiga.status, 404);
    assert.equal(tirada.dados.imagemUrl, undefined);
    assert.equal(depois.status, 404);
  });

  it('recusa um ficheiro que não é uma imagem, mesmo com nome de imagem', async () => {
    const { token } = await criarConta('Quinta das Fotos');
    const { dados: produto } = await pedir('POST', '/products', {
      token,
      corpo: PRODUTO,
    });

    const { estado, dados } = await pedir(
      'PUT',
      `/products/${produto.id}/imagem`,
      {
        token,
        corpo: imagem(
          Buffer.from('<script>alert(1)</script>'),
          'image/png',
          'foto.png',
        ),
      },
    );

    assert.equal(estado, 400);
    assert.match(dados.erro, /JPEG, PNG ou WebP/);
  });

  it('recusa fotografias com mais de 5 MB', async () => {
    const { token } = await criarConta('Quinta das Fotos');
    const { dados: produto } = await pedir('POST', '/products', {
      token,
      corpo: PRODUTO,
    });
    const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);

    const { estado, dados } = await pedir(
      'PUT',
      `/products/${produto.id}/imagem`,
      {
        token,
        corpo: imagem(grande),
      },
    );

    assert.equal(estado, 400);
    assert.match(dados.erro, /5 MB/);
  });
});
