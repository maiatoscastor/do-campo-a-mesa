import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/cliente.js';
import CampoPesquisa from './CampoPesquisa.jsx';
import { semAcentos } from '../produtos.js';

// A opção com este nome, sem contar com acentos nem maiúsculas ("moncao" encontra "Monção")
function procurar(opcoes, texto) {
  const alvo = semAcentos(texto.trim());
  return opcoes.find((opcao) => semAcentos(opcao.texto) === alvo);
}

// Concelho e freguesia, de qualquer parte do país, a partir da lista oficial que a API disponibiliza.
// São campos de pesquisa: escreve-se parte do nome e escolhe-se da lista.
// O formulário guarda os códigos; o texto escrito só serve para os encontrar.
export default function CamposLocalizacao({
  concelho,
  freguesia,
  definir,
  detalhes,
  textoInicial = {},
}) {
  const [regioes, setRegioes] = useState(null);
  const [freguesias, setFreguesias] = useState({ concelho: null, lista: [] });
  const [falhou, setFalhou] = useState(false);
  // Ao editar uma localização que já existe, os campos começam com os nomes dela
  const [textoConcelho, setTextoConcelho] = useState(
    textoInicial.concelho ?? '',
  );
  const [textoFreguesia, setTextoFreguesia] = useState(
    textoInicial.freguesia ?? '',
  );

  useEffect(() => {
    let cancelado = false;
    api('/localidades')
      .then((dados) => !cancelado && setRegioes(dados.regioes))
      .catch(() => !cancelado && setFalhou(true));
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!concelho) {
      return undefined;
    }
    // Se o concelho mudar antes de a resposta chegar, ignora-se a resposta antiga
    let cancelado = false;
    api(`/localidades/${concelho}/freguesias`)
      .then((lista) => !cancelado && setFreguesias({ concelho, lista }))
      .catch(() => !cancelado && setFalhou(true));
    return () => {
      cancelado = true;
    };
  }, [concelho]);

  // Por ordem alfabética. Há nomes repetidos (Lagoa, no Algarve e nos Açores): esses levam a região.
  const opcoesConcelho = useMemo(() => {
    const todos = (regioes ?? []).flatMap((regiao) =>
      regiao.concelhos.map((c) => ({ ...c, regiao: regiao.nome })),
    );
    const repetido = (nome) => todos.filter((c) => c.nome === nome).length > 1;
    return todos
      .map(({ codigo, nome, regiao }) => ({
        codigo,
        texto: repetido(nome) ? `${nome} (${regiao})` : nome,
      }))
      .sort((a, b) => a.texto.localeCompare(b.texto, 'pt'));
  }, [regioes]);

  // A lista só serve se for do concelho escolhido; enquanto a nova não chega, não há lista
  const lista = freguesias.concelho === concelho ? freguesias.lista : null;
  const opcoesFreguesia = (lista ?? []).map(({ codigo, nome }) => ({
    codigo,
    texto: nome,
  }));

  function escreverConcelho(texto) {
    setTextoConcelho(texto);
    const codigo = procurar(opcoesConcelho, texto)?.codigo ?? '';
    // Ao mudar de concelho, a freguesia escolhida deixa de fazer sentido
    if (codigo !== concelho) {
      definir('concelho', codigo);
      definir('freguesia', '');
      setTextoFreguesia('');
    }
  }

  function escreverFreguesia(texto) {
    setTextoFreguesia(texto);
    definir('freguesia', procurar(opcoesFreguesia, texto)?.codigo ?? '');
  }

  // Ao sair do campo, o nome fica escrito como na lista oficial ("moncao" passa a "Monção")
  function acertar(opcoes, codigo, setTexto) {
    const opcao = opcoes.find((o) => o.codigo === codigo);
    if (opcao) {
      setTexto(opcao.texto);
    }
  }

  let textoDaFreguesia = 'Escolha primeiro o concelho';
  if (concelho) {
    textoDaFreguesia = lista ? 'Escreva para pesquisar' : 'A carregar…';
  }

  return (
    <>
      <CampoPesquisa
        rotulo="Concelho"
        nome="concelho"
        opcoes={opcoesConcelho}
        placeholder={regioes ? 'Escreva para pesquisar' : 'A carregar…'}
        value={textoConcelho}
        aoMudar={escreverConcelho}
        onBlur={() => acertar(opcoesConcelho, concelho, setTextoConcelho)}
        disabled={!regioes}
        erro={detalhes.concelho}
        ajuda={
          falhou
            ? 'Não foi possível carregar a lista. Recarregue a página.'
            : undefined
        }
      />

      <CampoPesquisa
        rotulo="Freguesia"
        nome="freguesia"
        opcoes={opcoesFreguesia}
        placeholder={textoDaFreguesia}
        value={textoFreguesia}
        aoMudar={escreverFreguesia}
        onBlur={() => acertar(opcoesFreguesia, freguesia, setTextoFreguesia)}
        disabled={!lista}
        erro={detalhes.freguesia}
      />
    </>
  );
}
