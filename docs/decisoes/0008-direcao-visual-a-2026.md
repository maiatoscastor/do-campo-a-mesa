# 0008. Direção visual "A 2026"

- **Estado:** Aceite
- **Data:** 2026-10-20

## Contexto

O [ADR 0006](0006-design-proprio.md) decidiu criar um design próprio sobre Bootstrap e SASS, e mostrar direções visuais antes de implementar. Foram apresentadas três:

- **A "Mercado fresco":** verde-folha e laranja sobre branco;
- **B "Granito e vinho verde":** identidade do Alto Minho;
- **C "Horta serena":** acessibilidade como argumento central.

O aluno preferiu as cores da A, por terem melhor contraste e um ar mais profissional, e pediu que o estilo se baseasse em pesquisa sobre o que se faz de mais atual. A pesquisa (outubro de 2026) apontou:

- sistemas de tokens e escalas de cor com papéis fixos (W3C Design Tokens, Radix Colors, estilos do shadcn/ui);
- grelhas em bento;
- navegação inferior e folhas inferiores no telemóvel;
- transições entre páginas (View Transitions);
- vidro fosco apenas em barras fixas, por causa dos problemas de acessibilidade do Liquid Glass;
- as boas práticas de lojas online da Baymard (filtros aplicados visíveis, botão de pesquisa ao lado do campo).

Com base nisso foi construído um protótipo interativo ([`docs/design/prototipo-a-2026.html`](../design/prototipo-a-2026.html)), que o aluno aprovou.

## Decisão

| Tema | Escolha |
|---|---|
| Cores | Escalas de 12 passos geradas em OKLCH a partir de `#1F7A3D` (verde) e `#C2410C` (laranja), mais um neutro esverdeado. Âmbar, azul e vermelho para os estados. Passos 1–2 fundos · 3–5 componentes · 6–8 bordas · 9–10 sólidos · 11–12 texto. |
| Contraste | Todas as combinações usadas passam o nível AA da WCAG nos dois modos, verificado pelo gerador [`docs/design/gerar-escalas-de-cor.py`](../design/gerar-escalas-de-cor.py). |
| Modo escuro | Claro e escuro desde o início, com os modos de cor do Bootstrap 5.3 (`data-bs-theme`). Só as escalas mudam; os componentes usam tokens semânticos. |
| Tipografia | Bricolage Grotesque nos títulos e Plus Jakarta Sans no resto, com números tabulares em preços e contagens. As fontes ficam alojadas no próprio projeto. |
| Ícones | Material Symbols Rounded, com o ícone preenchido no separador ativo. A forma de os carregar decide-se no Passo 1. |
| Forma e espaço | Raios de 10, 14, 20 e 28 px e pílulas; espaçamento em múltiplos de 4 px. |
| Padrões | Início em bento; navegação inferior no telemóvel e cabeçalho no desktop; filtros numa folha inferior (offcanvas) no telemóvel e numa barra lateral no desktop; filtros aplicados sempre visíveis; ações principais ao alcance do polegar. |
| Movimento | View Transitions entre páginas e micro-interações (licitações, carrinho), desligados com `prefers-reduced-motion`. |
| Imagens | Fotografias dos produtores; ilustrações próprias por categoria quando não há fotografia. |

## Alternativas consideradas

- **Direção B.** Mais memorável e regional, mas a mais arriscada visualmente.
- **Direção C.** A mais acessível, mas o aluno achou-a menos profissional.
- **Reproduzir os mockups do docente.** Sem diferenciação, e com os problemas de usabilidade identificados no [ADR 0006](0006-design-proprio.md).

## Consequências

- Os tokens passam para SASS e alimentam as variáveis do Bootstrap: cores, raios, tipografia e os breakpoints 768/1024/1280.
- O protótipo serve só de referência visual. O código da aplicação é escrito de raiz em React, porque o protótipo é JavaScript sem framework.
- Entram dependências que o guia não usa: as fontes alojadas e os ícones. A justificação está no [plano de trabalho](../plano.md).
