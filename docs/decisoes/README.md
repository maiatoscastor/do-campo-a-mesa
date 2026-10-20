# Registo de decisões (ADR)

Cada decisão relevante de arquitetura, tecnologia ou processo fica registada num ficheiro próprio e numerado (*Architecture Decision Record*). Os registos não se reescrevem: se uma decisão mudar, cria-se um registo novo que a substitui e o antigo passa ao estado "Substituída por NNNN". Assim fica visível o raciocínio ao longo do tempo, que serve de base à secção de decisões técnicas do relatório.

| N.º | Decisão | Estado | Data |
|---|---|---|---|
| [0001](0001-comecar-do-zero.md) | Começar o repositório do zero, com o esqueleto do docente só como referência | Aceite | 2026-10-10 |
| [0002](0002-react-para-a-spa.md) | React para a SPA | Aceite | 2026-10-10 |
| [0003](0003-javascript-com-es-modules.md) | JavaScript com ES modules, em vez de TypeScript | Aceite | 2026-10-10 |
| [0004](0004-tecnologias-e-versoes.md) | Tecnologias e versões atuais | Aceite | 2026-10-10 |
| [0005](0005-fluxo-de-trabalho-git.md) | Fluxo de trabalho com Git e GitHub | Aceite | 2026-10-10 |
| [0006](0006-design-proprio.md) | Design próprio sobre Bootstrap e SASS | Aceite (direção no ADR 0008) | 2026-10-10 |
| [0007](0007-documentacao-do-projeto.md) | Documentação do projeto | Aceite | 2026-10-10 |
| [0008](0008-direcao-visual-a-2026.md) | Direção visual "A 2026" | Aceite | 2026-10-20 |

## Modelo

```markdown
# NNNN. Título da decisão

- **Estado:** Proposta | Aceite | Substituída por NNNN
- **Data:** AAAA-MM-DD

## Contexto
O problema e as restrições que levaram à decisão.

## Decisão
O que se decidiu.

## Alternativas consideradas
As outras opções e porque foram postas de lado.

## Consequências
O que se ganha, o que se perde e o que fica por fazer.
```
