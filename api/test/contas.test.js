import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { ligarBaseDeDados } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { cifrarPassword } from '../src/utils/password.js';

const PASSWORD = 'uma-password-de-teste';

const COMPRADOR = {
  nome: 'Comprador de Teste',
  email: 'comprador@teste.pt',
  password: PASSWORD,
};

const PRODUTOR = {
  nome: 'Produtora de Teste',
  email: 'produtora@teste.pt',
  password: PASSWORD,
  papel: 'produtor',
  nomeExploracao: 'Exploração de Teste',
  localidade: 'Monção',
};

let servidor;
let base;

// Os testes correm numa base de dados à parte, com o nome da de desenvolvimento e "-teste" no fim,
// para nunca tocarem nos dados de quem está a desenvolver
before(async () => {
  const endereco = new URL(process.env.MONGODB_URI);
  endereco.pathname += '-teste';
  process.env.MONGODB_URI = endereco.href;
  await ligarBaseDeDados();
  await User.init();

  // Porta 0: o sistema escolhe uma livre
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

beforeEach(() => User.deleteMany({}));

after(async () => {
  servidor.close();
  // Confirma o nome antes de apagar, para nunca apagar outra base de dados por engano
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
  return { estado: resposta.status, dados: await resposta.json() };
}

function registar(dados) {
  return pedir('POST', '/auth/registo', { corpo: dados });
}

async function criarAdminEEntrar() {
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

describe('registo', () => {
  it('cria um comprador e inicia a sessão', async () => {
    const { estado, dados } = await registar(COMPRADOR);

    assert.equal(estado, 201);
    assert.ok(dados.token);
    assert.equal(dados.utilizador.papel, 'comprador');
    assert.equal(dados.utilizador.email, COMPRADOR.email);
    assert.equal(dados.utilizador.passwordHash, undefined);
  });

  it('guarda o hash e nunca a password', async () => {
    await registar(COMPRADOR);

    const guardado = await User.findOne({ email: COMPRADOR.email }).select(
      '+passwordHash',
    );
    assert.match(guardado.passwordHash, /^\$2[aby]\$12\$/);
    assert.ok(!guardado.passwordHash.includes(PASSWORD));
  });

  it('deixa o produtor à espera de validação', async () => {
    const { estado, dados } = await registar(PRODUTOR);

    assert.equal(estado, 201);
    assert.equal(dados.utilizador.papel, 'produtor');
    assert.equal(dados.utilizador.produtor.validacao, 'pendente');
    assert.equal(dados.utilizador.produtor.localidade, 'Monção');
  });

  it('não deixa criar administradores', async () => {
    const { estado } = await registar({ ...COMPRADOR, papel: 'admin' });

    assert.equal(estado, 400);
    assert.equal(await User.countDocuments(), 0);
  });

  it('ignora os campos que não são permitidos', async () => {
    const { dados } = await registar({
      ...PRODUTOR,
      validacao: 'aprovado',
      produtor: { validacao: 'aprovado' },
      passwordHash: 'falso',
    });

    assert.equal(dados.utilizador.produtor.validacao, 'pendente');
    const guardado = await User.findOne({ email: PRODUTOR.email }).select(
      '+passwordHash',
    );
    assert.notEqual(guardado.passwordHash, 'falso');
  });

  it('indica todos os campos com problemas de uma vez', async () => {
    const { estado, dados } = await registar({
      nome: ' ',
      email: 'isto-nao-e-um-email',
      password: 'curta',
    });

    assert.equal(estado, 400);
    assert.deepEqual(Object.keys(dados.detalhes).sort(), [
      'email',
      'nome',
      'password',
    ]);
  });

  it('indica os campos em falta do produtor pelo nome', async () => {
    const { estado, dados } = await registar({
      ...COMPRADOR,
      papel: 'produtor',
      localidade: 'Lisboa',
    });

    assert.equal(estado, 400);
    assert.deepEqual(Object.keys(dados.detalhes).sort(), [
      'localidade',
      'nomeExploracao',
    ]);
  });

  it('recusa uma password maior do que o bcrypt usa', async () => {
    const { estado, dados } = await registar({
      ...COMPRADOR,
      password: 'a'.repeat(73),
    });

    assert.equal(estado, 400);
    assert.ok(dados.detalhes.password);
  });

  it('recusa um email repetido, mesmo com outras maiúsculas', async () => {
    await registar(COMPRADOR);
    const { estado, dados } = await registar({
      ...COMPRADOR,
      email: 'COMPRADOR@teste.pt',
    });

    assert.equal(estado, 409);
    assert.ok(dados.detalhes.email);
  });

  it('não rebenta com um pedido sem corpo', async () => {
    const { estado } = await pedir('POST', '/auth/registo');

    assert.equal(estado, 400);
  });
});

describe('início de sessão', () => {
  beforeEach(() => registar(COMPRADOR));

  it('entra com os dados certos', async () => {
    const { estado, dados } = await pedir('POST', '/auth/login', {
      corpo: { email: 'Comprador@Teste.pt', password: PASSWORD },
    });

    assert.equal(estado, 200);
    assert.ok(dados.token);
    assert.equal(dados.utilizador.passwordHash, undefined);
  });

  it('responde da mesma forma a password errada e a email inexistente', async () => {
    const errada = await pedir('POST', '/auth/login', {
      corpo: { email: COMPRADOR.email, password: 'outra-password' },
    });
    const inexistente = await pedir('POST', '/auth/login', {
      corpo: { email: 'ninguem@teste.pt', password: PASSWORD },
    });

    assert.equal(errada.estado, 401);
    assert.deepEqual(errada, inexistente);
  });

  it('não aceita objetos no lugar do email ou da password', async () => {
    const { estado } = await pedir('POST', '/auth/login', {
      corpo: { email: { $gt: '' }, password: { $gt: '' } },
    });

    assert.equal(estado, 401);
  });

  it('não rebenta com um pedido sem corpo', async () => {
    const { estado } = await pedir('POST', '/auth/login');

    assert.equal(estado, 401);
  });
});

describe('sessão', () => {
  it('devolve o utilizador do token', async () => {
    const { dados: registo } = await registar(COMPRADOR);
    const { estado, dados } = await pedir('GET', '/auth/eu', {
      token: registo.token,
    });

    assert.equal(estado, 200);
    assert.equal(dados.email, COMPRADOR.email);
    assert.equal(dados.passwordHash, undefined);
  });

  it('recusa um pedido sem token', async () => {
    const { estado } = await pedir('GET', '/auth/eu');

    assert.equal(estado, 401);
  });

  it('recusa tokens inválidos', async () => {
    const { dados } = await registar(COMPRADOR);
    const { id, papel, nome } = jwt.decode(dados.token);
    const conteudo = { id, papel, nome };
    const semAssinatura = [
      Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
      Buffer.from(JSON.stringify(conteudo)).toString('base64url'),
      '',
    ].join('.');

    const invalidos = {
      lixo: 'isto-nao-e-um-token',
      'outro segredo': jwt.sign(conteudo, 'outro-segredo'),
      expirado: jwt.sign(conteudo, process.env.JWT_SECRET, {
        expiresIn: -1,
      }),
      'sem assinatura': semAssinatura,
    };

    for (const [caso, token] of Object.entries(invalidos)) {
      const { estado } = await pedir('GET', '/auth/eu', { token });
      assert.equal(estado, 401, caso);
    }
  });

  it('termina a sessão de uma conta que já não existe', async () => {
    const { dados } = await registar(COMPRADOR);
    await User.deleteMany({});

    const { estado } = await pedir('GET', '/auth/eu', { token: dados.token });

    assert.equal(estado, 401);
  });
});

describe('validação de produtores', () => {
  it('é só para administradores', async () => {
    const { dados: comprador } = await registar(COMPRADOR);

    const semToken = await pedir('GET', '/admin/produtores/pendentes');
    const semPapel = await pedir('GET', '/admin/produtores/pendentes', {
      token: comprador.token,
    });

    assert.equal(semToken.estado, 401);
    assert.equal(semPapel.estado, 403);
  });

  it('lista só os produtores pendentes', async () => {
    const token = await criarAdminEEntrar();
    await registar(COMPRADOR);
    await registar(PRODUTOR);

    const { estado, dados } = await pedir(
      'GET',
      '/admin/produtores/pendentes',
      {
        token,
      },
    );

    assert.equal(estado, 200);
    assert.deepEqual(
      dados.map((produtor) => produtor.email),
      [PRODUTOR.email],
    );
  });

  it('aprova e rejeita, e o produtor sai da lista', async () => {
    const token = await criarAdminEEntrar();
    const { dados: registo } = await registar(PRODUTOR);
    const caminho = `/admin/produtores/${registo.utilizador.id}/validacao`;

    const aprovado = await pedir('PATCH', caminho, {
      token,
      corpo: { aprovado: true },
    });
    assert.equal(aprovado.estado, 200);
    assert.equal(aprovado.dados.produtor.validacao, 'aprovado');

    const { dados: pendentes } = await pedir(
      'GET',
      '/admin/produtores/pendentes',
      { token },
    );
    assert.deepEqual(pendentes, []);

    const rejeitado = await pedir('PATCH', caminho, {
      token,
      corpo: { aprovado: false },
    });
    assert.equal(rejeitado.dados.produtor.validacao, 'rejeitado');

    // O próprio produtor vê a decisão na sua sessão
    const { dados: eu } = await pedir('GET', '/auth/eu', {
      token: registo.token,
    });
    assert.equal(eu.produtor.validacao, 'rejeitado');
  });

  it('exige uma resposta booleana', async () => {
    const token = await criarAdminEEntrar();
    const { dados: registo } = await registar(PRODUTOR);

    const { estado } = await pedir(
      'PATCH',
      `/admin/produtores/${registo.utilizador.id}/validacao`,
      { token, corpo: { aprovado: 'sim' } },
    );

    assert.equal(estado, 400);
  });

  it('só valida produtores que existem', async () => {
    const token = await criarAdminEEntrar();
    const { dados: comprador } = await registar(COMPRADOR);
    const corpo = { aprovado: true };

    const casos = {
      'identificador mal formado': ['nao-e-um-id', 400],
      'identificador sem conta': [new mongoose.Types.ObjectId(), 404],
      'conta de comprador': [comprador.utilizador.id, 404],
    };

    for (const [caso, [id, esperado]] of Object.entries(casos)) {
      const { estado } = await pedir(
        'PATCH',
        `/admin/produtores/${id}/validacao`,
        { token, corpo },
      );
      assert.equal(estado, esperado, caso);
    }
  });
});
