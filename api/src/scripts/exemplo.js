import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { ligarBaseDeDados } from '../config/db.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { cifrarPassword } from '../utils/password.js';

// Dados de exemplo para testar a aplicação: npm run exemplo (e npm run exemplo -- --apagar).
// Os produtores e os produtos são inventados, por isso ficam marcados com exemplo: true e aparecem
// com o selo "Exemplo". As localidades, as variedades e as épocas são reais.
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

// Apaga tudo o que está marcado como exemplo: primeiro os produtos, depois os produtores
async function apagarExemplos() {
  const produtos = await Product.deleteMany({ exemplo: true });
  const produtores = await User.deleteMany({ exemplo: true });
  console.log(
    `Apagados ${produtos.deletedCount} produtos e ${produtores.deletedCount} produtores de exemplo.`,
  );
}

async function criarExemplos() {
  await apagarExemplos();
  for (const { produtos, ...dados } of PRODUTORES) {
    const endereco = dados.nomeExploracao
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replaceAll(' ', '-');
    // Os produtores de exemplo não servem para entrar: a password é aleatória e ninguém a sabe,
    // e o domínio .invalid está reservado para endereços que não existem
    const produtor = await User.create({
      nome: dados.nomeExploracao,
      email: `${endereco}@exemplo.invalid`,
      passwordHash: await cifrarPassword(randomBytes(24).toString('hex')),
      papel: 'produtor',
      produtor: { ...dados, validacao: 'aprovado' },
      exemplo: true,
    });
    await Product.insertMany(
      produtos.map((produto) => ({
        ...produto,
        produtor: produtor.id,
        exemplo: true,
      })),
    );
  }
  const total = PRODUTORES.flatMap((p) => p.produtos).length;
  console.log(
    `Criados ${PRODUTORES.length} produtores e ${total} produtos de exemplo.`,
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
