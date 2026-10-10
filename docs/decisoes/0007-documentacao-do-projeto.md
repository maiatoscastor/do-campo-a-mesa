# 0007. Documentação do projeto

- **Estado:** Aceite
- **Data:** 2026-10-10

## Contexto

O docente pede o relatório no `README.md` do projeto, a explicar o que foi feito e como. O enunciado pede também instruções de instalação e execução no README e limita o relatório a 20 páginas. O guia propunha um `docs/relatorio.md`, que fica substituído por esta indicação do docente.

## Decisão

| Documento | Para quê | Quando se atualiza |
|---|---|---|
| `README.md` | Relatório final e instruções de instalação | Ao concluir cada passo (a secção correspondente) |
| `docs/decisoes/` | Uma decisão por ficheiro (ADR), com contexto e alternativas | Sempre que se toma uma decisão relevante |
| `CHANGELOG.md` | Alterações por versão | Em cada integração no `main` e em cada marco |

## Alternativas consideradas

- **Só o README.** Mistura o relatório final com o registo das decisões e perde o raciocínio de cada uma.
- **Escrever o relatório só na semana 7.** Concentra o esforço no fim e perde detalhes do que foi feito.

## Consequências

- O relatório constrói-se ao longo do projeto, e a secção de decisões técnicas sai diretamente dos ADRs.
- É preciso manter os documentos atualizados, o que faz parte da definição de "feito" de cada passo.
