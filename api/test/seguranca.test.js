import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import express from 'express';
import app from '../src/app.js';
import { criarLimite } from '../src/middleware/limites.js';
import { PASTA_UPLOADS } from '../src/utils/imagens.js';

// Arranca um servidor numa porta livre e devolve o endereço e a forma de o fechar
async function arrancar(aplicacao) {
  const servidor = aplicacao.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  return {
    base: `http://localhost:${servidor.address().port}`,
    fechar: () => servidor.close(),
  };
}

// Os cabeçalhos de segurança não precisam da base de dados (a saúde responde 503 sem ela)
describe('cabeçalhos de segurança', () => {
  let api;
  before(async () => {
    api = await arrancar(app);
  });
  after(() => api.fechar());

  it('vão em todas as respostas, sem dizer que o servidor é Express', async () => {
    const resposta = await fetch(`${api.base}/api/health`);
    const politica = resposta.headers.get('content-security-policy');

    assert.equal(resposta.headers.get('x-powered-by'), null);
    assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    assert.match(
      resposta.headers.get('strict-transport-security'),
      /max-age=\d+/,
    );
    assert.equal(resposta.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(
      resposta.headers.get('cross-origin-resource-policy'),
      'same-origin',
    );
    assert.match(politica, /script-src 'self'/);
    assert.doesNotMatch(politica, /upgrade-insecure-requests/);
  });

  it('deixam a aplicação web mostrar as fotografias a partir de outro endereço', async () => {
    // Um ficheiro na pasta das fotografias, com um nome à sorte, apagado no fim
    const nome = `teste-${randomUUID()}.txt`;
    const ficheiro = new URL(nome, PASTA_UPLOADS);
    await mkdir(PASTA_UPLOADS, { recursive: true });
    await writeFile(ficheiro, 'teste');
    try {
      const resposta = await fetch(`${api.base}/uploads/${nome}`);

      assert.equal(resposta.status, 200);
      assert.equal(
        resposta.headers.get('cross-origin-resource-policy'),
        'cross-origin',
      );
      assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
    } finally {
      await rm(ficheiro, { force: true });
    }
  });
});

// O limite num servidor pequeno, só com ele: /tentar responde 200, e /tentar?falha responde 401
// (como uma password errada) ou 400 (como um campo mal preenchido, com ?erro)
async function servidorCom(limite) {
  const pequena = express();
  pequena.get('/tentar', limite, (req, res) => {
    if ('falha' in req.query) {
      return res.status(401).json({ erro: 'Email ou password errados' });
    }
    if ('erro' in req.query) {
      return res.status(400).json({ erro: 'Dados inválidos' });
    }
    res.json({ ok: true });
  });
  return arrancar(pequena);
}

describe('limite de tentativas', () => {
  it('conta só as falhadas, e depois do limite recusa até a janela acabar', async () => {
    const servidor = await servidorCom(
      criarLimite({
        janelaMs: 15 * 60 * 1000,
        maximo: 3,
        contar: 'falhados',
        mensagem: (falta) => `Tente de novo daqui a ${falta}.`,
      }),
    );
    const tentar = (pedido = '') =>
      fetch(`${servidor.base}/tentar${pedido}`).then(async (resposta) => ({
        estado: resposta.status,
        cabecalhos: resposta.headers,
        dados: await resposta.json(),
      }));

    try {
      // As que correm bem não gastam tentativas
      assert.equal((await tentar()).estado, 200);
      assert.equal((await tentar()).estado, 200);
      for (let i = 0; i < 3; i += 1) {
        assert.equal((await tentar('?falha')).estado, 401);
      }
      const recusada = await tentar('?falha');
      // Bloqueado, mesmo que agora acertasse: senão, bastava ir tentando até acertar
      const certaDepois = await tentar();

      assert.equal(recusada.estado, 429);
      assert.deepEqual(recusada.dados, {
        erro: 'Tente de novo daqui a 15 minutos.',
      });
      assert.ok(Number(recusada.cabecalhos.get('retry-after')) > 0);
      assert.match(recusada.cabecalhos.get('ratelimit-policy'), /q=3; w=900/);
      assert.equal(recusada.cabecalhos.get('x-ratelimit-limit'), null);
      assert.equal(certaDepois.estado, 429);
    } finally {
      servidor.fechar();
    }
  });

  it('pode contar só as aceites, sem castigar quem se engana num campo', async () => {
    const servidor = await servidorCom(
      criarLimite({
        janelaMs: 60 * 60 * 1000,
        maximo: 2,
        contar: 'aceites',
        mensagem: (falta) => `Tente de novo daqui a ${falta}.`,
      }),
    );
    const estado = (pedido = '') =>
      fetch(`${servidor.base}/tentar${pedido}`).then(({ status }) => status);

    try {
      for (let i = 0; i < 4; i += 1) {
        assert.equal(await estado('?erro'), 400);
      }
      assert.equal(await estado(), 200);
      assert.equal(await estado(), 200);
      assert.equal(await estado(), 429);
    } finally {
      servidor.fechar();
    }
  });
});
