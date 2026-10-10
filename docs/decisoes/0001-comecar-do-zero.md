# 0001. Começar o repositório do zero, com o esqueleto do docente só como referência

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

O docente disponibilizou um esqueleto de código opcional (`api/` em Express 4 e `web/` em React 18), com as rotas definidas a responder `501` e marcadores `TODO` por passo. Na análise feita antes de começar encontrou-se o seguinte:

- **Dependências desatualizadas.** O guia assume o Node.js 20, que deixou de ter suporte a 30 de abril de 2026. O esqueleto usa React 18, Vite 5, Express 4 e Mongoose 8, quando as versões atuais são React 19, Vite 8, Express 5 e Mongoose 9.
- **Vulnerabilidades conhecidas.** O `npm audit` aos lockfiles do esqueleto encontra 11 vulnerabilidades (5 de gravidade alta).
- **Bugs que contrariam o enunciado:**
  - a sala de leilão só aceita compradores, por isso o produtor não consegue acompanhar o próprio leilão;
  - os erros 500 devolvem ao cliente a mensagem interna do servidor;
  - o hook `useLeilao` abre uma ligação Socket.io nova por cada sala.
- **O design vai ser próprio** (ADR 0006), por isso a parte web do esqueleto teria de ser quase toda reescrita.
- **O histórico de commits conta para a nota.** Começar com um commit de cerca de 1 600 linhas escritas por outra pessoa dilui esse histórico.

## Decisão

Criar o repositório do zero e escrever o código passo a passo. Mantêm-se a arquitetura, a estrutura de pastas e os nomes usados no enunciado e no guia (endpoints, eventos Socket.io, campos dos documentos), para que cada requisito seja fácil de reconhecer na avaliação. O esqueleto e o guia ficam como material de referência.

## Alternativas consideradas

- **Usar o esqueleto e completar os `TODO`.** Arranque mais rápido, mas herda as versões antigas, as vulnerabilidades e os bugs, e o primeiro commit não seria trabalho próprio.
- **Copiar o esqueleto e modernizá-lo.** Tem o mesmo problema de autoria e obriga a rever ficheiro a ficheiro o que foi atualizado.

## Consequências

- Versões atuais desde o início e código compreendido linha a linha, o que ajuda na defesa.
- Histórico de commits que reflete o trabalho real ao longo das 7 semanas.
- Custa cerca de meio dia a mais de configuração.
- É preciso garantir que nada do enunciado fica esquecido: cada passo é verificado contra os requisitos do enunciado e a checklist do guia antes de ser dado como concluído.
