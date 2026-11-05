import { useEffect, useId, useState } from 'react';
import Campo from './Campo.jsx';
import { semAcentos } from '../produtos.js';

// Campo de texto com uma lista de sugestões que se filtra ao escrever, sem acentos nem maiúsculas
// ("moncao" encontra "Monção"). Faz o papel de um datalist, que no telemóvel nem todos os browsers
// mostram. Segue o padrão "combobox" do W3C: as setas percorrem a lista, o Enter escolhe e o Escape
// fecha. As opções são { codigo, texto }, e quem o usa recebe sempre o texto, escrito ou escolhido.
export default function CampoPesquisa({
  rotulo,
  opcoes,
  value,
  aoMudar,
  onBlur,
  ...resto
}) {
  const id = useId();
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const lista = `${id}-lista`;

  // As que começam pelo que se escreveu vêm primeiro; dentro de cada grupo, a ordem mantém-se
  const alvo = semAcentos(value.trim());
  const sugestoes = opcoes
    .map((opcao) => ({ ...opcao, chave: semAcentos(opcao.texto) }))
    .filter(({ chave }) => chave.includes(alvo))
    .sort((a, b) => b.chave.startsWith(alvo) - a.chave.startsWith(alvo));

  // Com as setas, a lista desliza até à opção marcada
  useEffect(() => {
    if (ativa >= 0) {
      document
        .getElementById(`${id}-opcao-${ativa}`)
        ?.scrollIntoView({ block: 'nearest' });
    }
  }, [id, ativa]);

  function abrir(evento) {
    if (aberta) {
      return;
    }
    setAberta(true);
    // No telemóvel, o campo sobe para o cimo do ecrã, para a lista caber por cima do teclado
    if (window.matchMedia('(pointer: coarse)').matches) {
      evento.currentTarget.scrollIntoView({ block: 'start' });
    }
  }

  function fechar() {
    setAberta(false);
    setAtiva(-1);
  }

  function escrever(evento) {
    aoMudar(evento.target.value);
    setAberta(true);
    setAtiva(-1);
  }

  function escolher(opcao) {
    aoMudar(opcao.texto);
    fechar();
  }

  function teclar(evento) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const passo = evento.key === 'ArrowDown' ? 1 : -1;
      setAberta(true);
      setAtiva((i) => Math.min(Math.max(i + passo, 0), sugestoes.length - 1));
    } else if (evento.key === 'Enter' && aberta && sugestoes[ativa]) {
      // Escolhe a sugestão marcada, em vez de enviar o formulário
      evento.preventDefault();
      escolher(sugestoes[ativa]);
    } else if (evento.key === 'Escape') {
      fechar();
    }
  }

  return (
    <Campo
      {...resto}
      rotulo={rotulo}
      role="combobox"
      autoComplete="off"
      aria-autocomplete="list"
      aria-expanded={aberta}
      aria-controls={lista}
      aria-activedescendant={
        aberta && ativa >= 0 ? `${id}-opcao-${ativa}` : undefined
      }
      value={value}
      onChange={escrever}
      onClick={abrir}
      onKeyDown={teclar}
      onBlur={(evento) => {
        fechar();
        onBlur?.(evento);
      }}
      acessorio={
        // Sem o mousedown, tocar numa opção tirava o foco ao campo e fechava a lista antes do clique
        <div
          className="sugestoes"
          hidden={!aberta}
          onMouseDown={(evento) => evento.preventDefault()}
        >
          <ul id={lista} role="listbox" aria-label={rotulo}>
            {sugestoes.map((opcao, i) => (
              <li
                key={opcao.codigo}
                id={`${id}-opcao-${i}`}
                role="option"
                aria-selected={i === ativa}
                onClick={() => escolher(opcao)}
              >
                {opcao.texto}
              </li>
            ))}
          </ul>
          {sugestoes.length === 0 && (
            <p className="sugestoes-vazio">Nenhum resultado.</p>
          )}
        </div>
      }
    />
  );
}
