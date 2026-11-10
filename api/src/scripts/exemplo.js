import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { ligarBaseDeDados } from '../config/db.js';
import { Auction, descreverLote } from '../models/Auction.js';
import { Bid } from '../models/Bid.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { cifrarPassword } from '../utils/password.js';

// Dados de exemplo para testar a aplicação: npm run exemplo (e npm run exemplo -- --apagar).
// Os produtores, os produtos e os leilões são inventados, por isso ficam marcados com exemplo: true e
// aparecem com o selo "Exemplo". As localidades, as variedades e as épocas são reais.
// Só se usa na base de dados de desenvolvimento: a de produção arranca vazia.

const TODO_O_ANO = [];
const OUTONO_E_INVERNO = ['Outono', 'Inverno'];

const PRODUTORES = [
  {
    nomeExploracao: 'Quinta do Tio Abel',
    localizacao: { concelho: '1604', freguesia: '160438' },
    produtos: [
      {
        nome: 'Vinho Verde Alvarinho',
        categoria: 'Vinho',
        preco: 12.5,
        unidade: 'garrafa 75 cl',
        stock: 48,
        epocas: TODO_O_ANO,
      },
      {
        nome: 'Kiwi Hayward',
        categoria: 'Fruta',
        preco: 2.9,
        unidade: 'kg',
        stock: 120,
        biologico: true,
        epocas: OUTONO_E_INVERNO,
      },
    ],
  },
  {
    nomeExploracao: 'Horta da Dona Graça',
    localizacao: { concelho: '1607', freguesia: '160752' },
    produtos: [
      {
        nome: 'Grelos',
        categoria: 'Hortícolas',
        preco: 1.8,
        unidade: 'molho',
        stock: 40,
        biologico: true,
        epocas: OUTONO_E_INVERNO,
      },
      {
        nome: 'Couve-galega',
        categoria: 'Hortícolas',
        preco: 1.5,
        unidade: 'molho',
        stock: 35,
        biologico: true,
        epocas: OUTONO_E_INVERNO,
      },
      {
        nome: 'Abóbora-menina',
        categoria: 'Hortícolas',
        preco: 1.4,
        unidade: 'kg',
        stock: 60,
        biologico: true,
        epocas: OUTONO_E_INVERNO,
      },
      {
        nome: 'Ovos de galinhas criadas ao ar livre',
        categoria: 'Outros',
        preco: 3.4,
        unidade: 'dúzia',
        stock: 25,
        epocas: TODO_O_ANO,
      },
    ],
  },
  {
    nomeExploracao: 'Apiário Monte das Urzes',
    localizacao: { concelho: '1601', freguesia: '160153' },
    produtos: [
      {
        nome: 'Mel de urze',
        categoria: 'Mel',
        preco: 8.5,
        unidade: 'frasco 500 g',
        stock: 30,
        epocas: TODO_O_ANO,
      },
      {
        nome: 'Mel de castanheiro',
        categoria: 'Mel',
        preco: 7.9,
        unidade: 'frasco 500 g',
        stock: 4,
        epocas: TODO_O_ANO,
      },
    ],
  },
  {
    nomeExploracao: 'Adega da Ribeira Funda',
    localizacao: { concelho: '1606', freguesia: '160628' },
    produtos: [
      {
        nome: 'Vinho Verde Loureiro',
        categoria: 'Vinho',
        preco: 7.5,
        unidade: 'garrafa 75 cl',
        stock: 36,
        epocas: TODO_O_ANO,
      },
      {
        nome: 'Vinho Verde Vinhão',
        categoria: 'Vinho',
        preco: 6.9,
        unidade: 'garrafa 75 cl',
        stock: 0,
        epocas: TODO_O_ANO,
      },
    ],
  },
  {
    nomeExploracao: 'Quinta das Leiras Altas',
    localizacao: { concelho: '1605', freguesia: '160526' },
    produtos: [
      {
        nome: 'Queijo fresco de vaca',
        categoria: 'Queijo',
        preco: 3.2,
        unidade: 'unidade',
        stock: 15,
        epocas: TODO_O_ANO,
      },
      {
        nome: 'Broa de milho',
        categoria: 'Padaria',
        preco: 3,
        unidade: 'unidade',
        stock: 20,
        epocas: TODO_O_ANO,
      },
    ],
  },
  {
    nomeExploracao: 'Pomar da Fonte Fria',
    localizacao: { concelho: '1608', freguesia: '160820' },
    produtos: [
      {
        nome: 'Maçã Porta da Loja',
        categoria: 'Fruta',
        preco: 2.2,
        unidade: 'kg',
        stock: 80,
        epocas: OUTONO_E_INVERNO,
      },
      {
        nome: 'Castanha',
        categoria: 'Fruta',
        preco: 4.5,
        unidade: 'kg',
        stock: 50,
        epocas: ['Outono'],
      },
    ],
  },
];

const HORA = 60 * 60 * 1000;

// Um dia daqui a "dias", à hora indicada (por exemplo, amanhã às 18:00)
function diaAs(dias, hora) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  data.setHours(hora, 0, 0, 0);
  return data;
}

// Os leilões de exemplo, com as horas a contar do momento em que o comando corre: um a decorrer e
// dois marcados. Ao correr o comando outra vez, voltam a ser criados com horas novas.
function leiloesDeExemplo() {
  const agora = new Date();
  return [
    {
      produto: 'Castanha',
      quantidade: 25,
      precoBase: 60,
      incremento: 2,
      iniciaEm: agora,
      terminaEm: new Date(agora.getTime() + 72 * HORA),
    },
    {
      produto: 'Kiwi Hayward',
      quantidade: 50,
      precoBase: 90,
      incremento: 5,
      iniciaEm: diaAs(1, 18),
      terminaEm: diaAs(1, 19),
    },
    {
      produto: 'Mel de urze',
      quantidade: 20,
      precoBase: 100,
      incremento: 5,
      iniciaEm: diaAs(2, 21),
      terminaEm: new Date(diaAs(2, 21).getTime() + HORA / 2),
    },
  ];
}

// Apaga os leilões de exemplo, com as licitações
async function apagarLeiloes() {
  const leiloes = await Auction.find({ exemplo: true }).distinct('_id');
  await Bid.deleteMany({ leilao: { $in: leiloes } });
  await Auction.deleteMany({ _id: { $in: leiloes } });
  return leiloes.length;
}

// Apaga tudo o que está marcado como exemplo (npm run exemplo -- --apagar): primeiro os leilões e
// os produtos, depois os produtores. As encomendas já feitas a produtores de exemplo ficam sem
// produtor, por isso o comando avisa quantas são.
async function apagarExemplos() {
  const leiloes = await apagarLeiloes();
  const produtos = await Product.deleteMany({ exemplo: true });
  const produtores = await User.find({ exemplo: true }).distinct('_id');
  const encomendas = await Order.countDocuments({
    produtor: { $in: produtores },
  });
  await User.deleteMany({ _id: { $in: produtores } });
  console.log(
    `Apagados ${leiloes} leilões, ${produtos.deletedCount} produtos e ${produtores.length} produtores de exemplo.`,
  );
  if (encomendas > 0) {
    console.log(
      `Atenção: ${encomendas} encomendas eram de produtores de exemplo e ficaram sem produtor.`,
    );
  }
}

async function criarLeiloes() {
  const agora = new Date();
  for (const { produto: nome, quantidade, ...dados } of leiloesDeExemplo()) {
    const produto = await Product.findOne({ nome, exemplo: true });
    await Auction.create({
      ...dados,
      produtor: produto.produtor,
      produto: produto._id,
      nome: produto.nome,
      categoria: produto.categoria,
      unidade: produto.unidade,
      quantidade,
      lote: descreverLote(quantidade, produto.unidade),
      estado: dados.iniciaEm <= agora ? 'ativo' : 'agendado',
      exemplo: true,
    });
  }
}

// Cria o que falta. Os produtores e os produtos de exemplo que já existem ficam como estão (com o
// mesmo identificador e o stock que tiverem), para não estragar as encomendas e as avaliações feitas
// a eles; só os leilões são apagados e criados de novo, com horas a contar de agora.
async function criarExemplos() {
  await apagarLeiloes();
  let produtoresNovos = 0;
  let produtosNovos = 0;
  for (const { produtos, ...dados } of PRODUTORES) {
    const endereco = dados.nomeExploracao
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replaceAll(' ', '-');
    const email = `${endereco}@exemplo.invalid`;
    let produtor = await User.findOne({ email, exemplo: true });
    if (!produtor) {
      // Os produtores de exemplo não servem para entrar: a password é aleatória e ninguém a sabe,
      // e o domínio .invalid está reservado para endereços que não existem
      produtor = await User.create({
        nome: dados.nomeExploracao,
        email,
        passwordHash: await cifrarPassword(randomBytes(24).toString('hex')),
        papel: 'produtor',
        produtor: { ...dados, validacao: 'aprovado' },
        exemplo: true,
      });
      produtoresNovos += 1;
    }
    for (const produto of produtos) {
      const { upsertedCount } = await Product.updateOne(
        { produtor: produtor._id, nome: produto.nome, exemplo: true },
        { $setOnInsert: { ...produto, produtor: produtor._id, exemplo: true } },
        { upsert: true, runValidators: true },
      );
      produtosNovos += upsertedCount;
    }
  }
  await criarLeiloes();
  console.log(
    `Produtores de exemplo: ${produtoresNovos} criados (${PRODUTORES.length - produtoresNovos} já existiam). Produtos: ${produtosNovos} criados. Leilões: ${leiloesDeExemplo().length} criados de novo.`,
  );
}

try {
  await ligarBaseDeDados();
  if (!mongoose.connection.name.endsWith('-dev')) {
    throw new Error(
      `os dados de exemplo só se usam na base de dados de desenvolvimento (esta é "${mongoose.connection.name}")`,
    );
  }
  if (process.argv.includes('--apagar')) {
    await apagarExemplos();
  } else {
    await criarExemplos();
  }
} catch (erro) {
  console.error(`Não foi possível: ${erro.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
