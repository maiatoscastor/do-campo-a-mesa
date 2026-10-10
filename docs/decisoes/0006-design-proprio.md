# 0006. Design próprio sobre Bootstrap e SASS

- **Estado:** Aceite (a direção visual ainda está por escolher)
- **Data:** 2026-10-10

## Contexto

O enunciado obriga a usar **Bootstrap 5** e **SASS** (variáveis, mixins e parciais) com abordagem **Mobile First** e pelo menos 3 breakpoints (768, 1024 e 1280 px). Os mockups do docente são orientativos. A solução de referência do guia reproduz os mockups, por isso é provável que muitos trabalhos tenham esse aspeto. Ao analisá-la encontraram-se problemas de usabilidade no telemóvel:

- menu hambúrguer, longe do polegar;
- um ecrã inteiro de filtros antes do primeiro produto;
- valores no formato inglês ("225.00" em vez de "225,00 €").

## Decisão

Criar um **design system próprio** sobre o Bootstrap:

- **Tokens de design em SASS** (cores, tipografia, espaçamentos, raios, sombras) que alimentam as variáveis do Bootstrap. O próprio Bootstrap é configurado com os breakpoints 768/1024/1280, para haver uma só fonte de verdade.
- **Componentes próprios**, usando os mockups só como inspiração.

Princípios de usabilidade:

- **Mobile First a sério:**
  - navegação inferior no telemóvel;
  - filtros numa folha que sobe do fundo do ecrã;
  - ações principais ao alcance do polegar.
- **Formatos portugueses** (moeda, números e datas em pt-PT).
- **Acessibilidade ao nível WCAG AA:**
  - contraste suficiente;
  - foco visível;
  - etiquetas em todos os campos;
  - respeito por `prefers-reduced-motion`.

**Antes de implementar**, são apresentadas 2 ou 3 direções visuais (paleta, tipografia e componentes de exemplo em telemóvel e desktop) para o aluno escolher. A escolha fica registada num ADR próprio.

## Alternativas consideradas

- **Reproduzir os mockups do docente.** Menos trabalho de design, mas sem diferenciação e com os problemas de usabilidade descritos.
- **Usar o Bootstrap sem personalização.** Cumpre os requisitos, mas tem um aspeto genérico.

## Consequências

- Mais trabalho de design na semana 1, compensado pela consistência dos tokens nos ecrãs seguintes.
- A interface diferencia-se da solução de referência e é pensada para o uso real no telemóvel.
