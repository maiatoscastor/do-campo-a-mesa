# 0003. JavaScript com ES modules, em vez de TypeScript

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

O enunciado não impõe a linguagem para além de "framework JavaScript moderna" no frontend e Node.js no backend. Os materiais do docente estão todos em JavaScript. Na defesa, o aluno tem de explicar qualquer parte do código, e o projeto tem 7 semanas.

## Decisão

Usar **JavaScript moderno com ES modules** (`import`/`export`) no frontend e também na API, para os dois lados seguirem a mesma sintaxe. A qualidade do código é garantida com **ESLint** (deteção de erros) e **Prettier** (formatação automática), com comentários JSDoc onde ajudarem a perceber o código.

Os exemplos do guia usam CommonJS (`require`/`module.exports`); a tradução para ES modules é direta.

## Alternativas consideradas

- **TypeScript.** É o padrão na indústria e apanha erros de tipos antes de executar. Foi posto de lado porque acrescenta uma camada de conceitos e configuração (tipos dos modelos Mongoose, dos pedidos Express, dos eventos Socket.io) que teria de ser justificada na defesa, sem contar para os critérios de avaliação.
- **CommonJS na API**, como no guia. Funciona, mas obrigaria a usar duas sintaxes de módulos no mesmo repositório.

## Consequências

- Menos fricção e alinhamento com os materiais da cadeira.
- Menos garantias antes de executar: são compensadas com lint, testes automáticos e validação dos dados na API.
