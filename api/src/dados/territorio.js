import territorio from './territorio.json' with { type: 'json' };

// Concelhos e freguesias de Portugal, da Carta Administrativa Oficial de Portugal (CAOP 2025, da
// Direção-Geral do Território, licença CC BY 4.0). O territorio.json é gerado a partir dos dados
// oficiais e só tem os códigos e os nomes. Aqui criam-se índices para encontrar cada concelho e cada
// freguesia pelo código, sem percorrer a lista toda.
const concelhos = new Map();
const freguesias = new Map();

for (const regiao of territorio.regioes) {
  for (const concelho of regiao.concelhos) {
    concelhos.set(concelho.codigo, { ...concelho, regiao: regiao.nome });
    for (const freguesia of concelho.freguesias) {
      freguesias.set(freguesia.codigo, {
        ...freguesia,
        concelho: concelho.codigo,
      });
    }
  }
}

// De onde vêm os dados: a licença obriga a indicar a fonte
export const FONTE = {
  fonte: territorio.fonte,
  licenca: territorio.licenca,
  url: territorio.url,
};

// Os concelhos agrupados por distrito ou região autónoma, sem as freguesias, para os formulários
export const REGIOES = territorio.regioes.map((regiao) => ({
  nome: regiao.nome,
  concelhos: regiao.concelhos.map(({ codigo, nome }) => ({ codigo, nome })),
}));

export function concelhoPorCodigo(codigo) {
  return concelhos.get(codigo);
}

export function freguesiaPorCodigo(codigo) {
  return freguesias.get(codigo);
}
