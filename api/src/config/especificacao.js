import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// A documentação da API (OpenAPI), lida uma vez ao arrancar: serve a Swagger UI (app.js) e o estado
// dos serviços da administração (quantas operações tem)
export const especificacao = parse(
  readFileSync(new URL('../../openapi.yaml', import.meta.url), 'utf8'),
);
