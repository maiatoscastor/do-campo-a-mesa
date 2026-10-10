# 0004. Tecnologias e versões atuais

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

Os materiais do docente indicam versões de 2024 (Node.js 20, React 18, Vite 5, Express 4, Mongoose 8). Algumas já não têm suporte ou têm vulnerabilidades conhecidas (ADR 0001). As versões abaixo foram confirmadas no registo do npm e no calendário oficial do Node.js a 2026-10-10.

## Decisão

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 24 LTS como alvo (suporte até abril de 2028); localmente serve o 26, que passa a LTS a 2026-10-28 |
| Frontend | React · Vite · React Router | 19 · 8 · versão atual (a confirmar no Passo 2) |
| Estilos | Bootstrap · Sass · Bootstrap Icons | 5.3 · 1.105 · 1.13 |
| Tempo real | Socket.io (servidor e cliente) | 4.8 |
| API | Express | 5 |
| Base de dados | MongoDB com Mongoose | Mongoose 9 |
| Segurança | jsonwebtoken · bcryptjs | 9 · 3 |
| Uploads | multer | 2 |
| Documentação | swagger-ui-express · yaml | 5 · 2 (o `yamljs` do guia está sem manutenção) |
| Qualidade | ESLint · Prettier | 10 · 3 |

As bibliotecas de testes (Vitest, Supertest, mongodb-memory-server) e as de mapas (Leaflet) ficam para decidir quando forem precisas, cada uma com o seu próprio registo.

## Alternativas consideradas

- **Manter as versões do guia**, para os exemplos funcionarem sem alterações. Posto de lado por causa do fim de suporte do Node.js 20 e das vulnerabilidades.

## Consequências

- Alguns exemplos do guia precisam de pequenas adaptações:
  - o Express 5 já trata os erros de funções `async`, por isso dispensa o utilitário `a()` do guia;
  - a API do React Router e as opções do Mongoose 9 (por exemplo, devolver o documento atualizado num `findOneAndUpdate`) confirmam-se na documentação ao implementar.
- O Bootstrap 5.3 ainda usa `@import` do Sass, que está obsoleto: os avisos das dependências são silenciados na configuração do Vite, como no guia.
- A produção (Passo 8) usa o Node.js 24 LTS.
