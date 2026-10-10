# 0002. React para a SPA

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

O enunciado pede uma SPA "com uma framework JavaScript moderna" e aceita React ou Vue.js. O guia, o esqueleto e todos os exemplos de código do docente estão em React. O aluno não tinha preferência entre as duas.

## Decisão

Usar **React** com **Vite** (servidor de desenvolvimento e build) e **React Router** (routing no cliente). O estado global da sessão e do carrinho fica em **Context**, como o enunciado sugere.

## Alternativas consideradas

- **Vue 3 com Pinia e vue-router.** Igualmente válido para o enunciado, mas os exemplos do docente teriam de ser traduzidos e haveria menos material de apoio.

## Consequências

- Os exemplos do enunciado e do guia aplicam-se diretamente, adaptados às versões atuais (ADR 0004).
- Ecossistema grande (bibliotecas de mapas, testes, sockets).
- É preciso aprender os conceitos base do React: componentes, props, estado, efeitos e hooks. Vão ser explicados à medida que forem usados.
