import assert from 'node:assert/strict';
import { after, before, it } from 'node:test';
import app from '../src/app.js';

let servidor;
let base;

// A documentação não precisa da base de dados
before(async () => {
  servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => servidor.close());

it('mostra a documentação da API em /api-docs', async () => {
  const resposta = await fetch(`${base}/api-docs/`);

  assert.equal(resposta.status, 200);
  assert.match(await resposta.text(), /swagger-ui/);
});
