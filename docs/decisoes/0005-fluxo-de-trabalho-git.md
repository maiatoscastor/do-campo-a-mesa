# 0005. Fluxo de trabalho com Git e GitHub

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

O enunciado pede o código num repositório Git com commits regulares, e o histórico ao longo das 7 semanas pode ajustar a nota. O aluno quer trabalhar como num projeto real de uma empresa, mas sem complicar: não tem GitHub Pro e não quer configurar proteções agora.

## Decisão

- **Repositório privado no GitHub** (`do-campo-a-mesa`), partilhado com o docente só na entrega. Ser privado evita que colegas copiem código, o que poderia levar à anulação do trabalho.
- **`main` sempre estável.** Cada funcionalidade ou passo é desenvolvido num branch próprio e integrado no `main` quando a checklist desse passo estiver cumprida.
- **Nomes dos branches** simples e descritivos, em português, por exemplo `passo-1-design` ou `carrinho-de-compras`.
- **Integração sem "squash"** (Pull Request com merge commit, ou `git merge --no-ff`), para manter visíveis todos os commits individuais.
- **Mensagens de commit:** uma frase curta e descritiva em português, sem prefixos, por exemplo `Grelha mobile first do catálogo` ou `Impede que o estado da encomenda recue`. Quando for útil, o corpo da mensagem explica o porquê da alteração.
- **Commits pequenos e frequentes**, feitos à medida que o trabalho acontece, com a identidade Git do aluno. As datas dos commits nunca são alteradas.
- **Versões:** uma tag e uma release no GitHub por marco (v0.1.0 = M1, v0.2.0 = M2, v1.0.0 = M3), com as alterações descritas no `CHANGELOG.md`.
- **Integração contínua (GitHub Actions):** lint, testes e build em cada push e Pull Request, configurada assim que existir código.

## Alternativas consideradas

- **Trabalhar sempre no `main`, sem branches.** Mais simples, mas o histórico perde a separação por funcionalidade.
- **Git Flow** (branches `develop`, `release`, `hotfix`). Demasiado pesado para um projeto individual.
- **Mensagens no formato [Conventional Commits](https://www.conventionalcommits.org/)** (`feat(web): …`, `docs: …`). É comum na indústria e permite gerar changelogs automaticamente, mas o aluno preferiu frases simples, mais diretas de ler. Como o `CHANGELOG.md` é escrito à mão, não se perde nada.
- **Proteção de branches, quadros Kanban e templates de issues.** Ficam de fora para não complicar (a proteção de branches em repositórios privados exige GitHub Pro).

## Consequências

- O histórico conta a evolução do projeto funcionalidade a funcionalidade, e as releases marcam os marcos de avaliação.
- Exige disciplina: commits com mensagens claras e um branch por tarefa.
