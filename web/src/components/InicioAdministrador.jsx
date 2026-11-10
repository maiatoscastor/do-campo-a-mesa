import { useEffect, useState } from 'react';
import { api } from '../api/cliente.js';
import AtalhoInicio from './AtalhoInicio.jsx';
import { useTarefasAdmin } from '../hooks/useTarefasAdmin.js';
import { faseDoLeilao } from '../leiloes.js';

// O texto por baixo de cada atalho: "Nada à espera", "1 à espera de validação"…
function textoDaEspera(numero, umaEspera, variasEsperam) {
  if (numero === null) {
    return 'A contar…';
  }
  if (numero === 0) {
    return 'Nada à espera';
  }
  return numero === 1 ? umaEspera : `${numero} ${variasEsperam}`;
}

function textoDosLeiloes(leiloes) {
  if (!leiloes) {
    return 'A contar…';
  }
  const agora = Date.now();
  const aDecorrer = leiloes.filter((l) => faseDoLeilao(l, agora) === 'ativo');
  const marcados = leiloes.length - aDecorrer.length;
  const partes = [
    aDecorrer.length > 0 && `${aDecorrer.length} a decorrer`,
    marcados > 0 && `${marcados} ${marcados === 1 ? 'marcado' : 'marcados'}`,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Nenhum a decorrer';
}

// O início do administrador: o que espera por ele (produtores e denúncias, com os números da
// navegação) e os leilões a decorrer na aplicação
export default function InicioAdministrador() {
  const { produtoresPorValidar, denunciasPorDecidir } = useTarefasAdmin();
  const [leiloes, setLeiloes] = useState(null);

  useEffect(() => {
    let cancelado = false;
    api('/auctions')
      .then((lista) => !cancelado && setLeiloes(lista))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const atalhos = [
    {
      caminho: '/admin/produtores',
      icone: 'validar',
      titulo: 'Produtores por validar',
      texto: textoDaEspera(
        produtoresPorValidar,
        '1 à espera de validação',
        'à espera de validação',
      ),
      numero: produtoresPorValidar,
      sufixo: 'por validar',
    },
    {
      caminho: '/admin/denuncias',
      icone: 'denuncia',
      titulo: 'Denúncias por decidir',
      texto: textoDaEspera(
        denunciasPorDecidir,
        '1 avaliação denunciada',
        'avaliações denunciadas',
      ),
      numero: denunciasPorDecidir,
      sufixo: 'por decidir',
    },
    {
      caminho: '/leiloes',
      icone: 'leiloes',
      titulo: 'Leilões',
      texto: textoDosLeiloes(leiloes),
    },
  ];

  return (
    <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
      {atalhos.map((atalho) => (
        <div className="col" key={atalho.caminho}>
          <AtalhoInicio {...atalho} />
        </div>
      ))}
    </div>
  );
}
