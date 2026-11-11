import mongoose from 'mongoose';
import { constants } from 'node:fs';
import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { especificacao } from '../config/especificacao.js';
import { PASTA_UPLOADS } from '../utils/imagens.js';

const MB = 1024 * 1024;

// Corre uma verificação e mede quanto tempo demorou. Se falhar, a mensagem que vai para a página é
// sempre a mesma frase simples: o erro técnico (que pode ter pormenores da ligação) fica só no
// registo do servidor.
async function verificar(servico, mensagemDeErro, verificacao) {
  const inicio = performance.now();
  const tempo = () => Math.round(performance.now() - inicio);
  try {
    const detalhes = await verificacao();
    return { servico, estado: 'ok', latenciaMs: tempo(), detalhes };
  } catch (erro) {
    console.error(`Estado dos serviços (${servico}): ${erro.message}`);
    return {
      servico,
      estado: 'erro',
      latenciaMs: tempo(),
      mensagem: mensagemDeErro,
    };
  }
}

// O estado de cada parte da aplicação, verificado no momento do pedido: a API (há quanto tempo está
// a correr e quanta memória usa), o MongoDB (um ping, com o tempo de resposta), o Socket.io (quantas
// ligações e pessoas), o armazenamento das imagens (se se pode escrever, quantos ficheiros e quanto
// ocupam) e a documentação Swagger (quantas operações tem)
export async function estadoDosServicos(io) {
  const servicos = await Promise.all([
    verificar('api', 'A API não respondeu', () => ({
      ativaDesde: new Date(Date.now() - process.uptime() * 1000),
      node: process.version,
      memoriaMb: Math.round(process.memoryUsage().rss / MB),
    })),
    verificar('mongodb', 'Sem ligação à base de dados', async () => {
      if (mongoose.connection.readyState !== 1) {
        throw new Error(`readyState ${mongoose.connection.readyState}`);
      }
      await mongoose.connection.db.admin().ping();
      return { baseDeDados: mongoose.connection.name };
    }),
    verificar('socket', 'O Socket.io não está a correr', async () => {
      if (!io) {
        throw new Error('sem io');
      }
      const sockets = await io.fetchSockets();
      const pessoas = new Set(
        sockets.map(({ id, data }) => data.utilizador?.id ?? id),
      );
      return { ligacoes: sockets.length, pessoas: pessoas.size };
    }),
    verificar('armazenamento', 'Não é possível guardar imagens', async () => {
      await mkdir(PASTA_UPLOADS, { recursive: true });
      await access(PASTA_UPLOADS, constants.W_OK);
      const nomes = await readdir(PASTA_UPLOADS);
      const tamanhos = await Promise.all(
        nomes.map((nome) =>
          stat(new URL(nome, PASTA_UPLOADS)).then(({ size }) => size),
        ),
      );
      return {
        tipo: 'Disco do servidor',
        ficheiros: nomes.length,
        tamanhoMb:
          Math.round((tamanhos.reduce((soma, n) => soma + n, 0) / MB) * 10) /
          10,
      };
    }),
    verificar('swagger', 'A documentação não foi carregada', () => {
      const operacoes = Object.values(especificacao.paths ?? {}).reduce(
        (soma, caminho) =>
          soma +
          Object.keys(caminho).filter((metodo) =>
            ['get', 'post', 'put', 'patch', 'delete'].includes(metodo),
          ).length,
        0,
      );
      if (operacoes === 0) {
        throw new Error('sem operações');
      }
      return {
        endereco: '/api-docs',
        versao: especificacao.openapi,
        operacoes,
      };
    }),
  ]);
  return { verificadoEm: new Date(), servicos };
}
