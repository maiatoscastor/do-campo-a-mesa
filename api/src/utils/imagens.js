import { del, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import multer from 'multer';
import { criarErro } from './erro.js';

// Fotografias dos produtos e imagens das páginas dos produtores. Na publicação vão para o Vercel Blob
// (um storage na Cloud), porque o disco do servidor apaga-se a cada nova versão; a biblioteca lê a
// chave da variável BLOB_READ_WRITE_TOKEN. Sem a chave (no computador e nos testes), ficam na pasta
// api/uploads, fora do Git.
export const PASTA_UPLOADS = new URL('../../uploads/', import.meta.url);
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const TIPOS = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// Os nomes são aleatórios e nunca mudam, por isso o browser e a CDN podem guardar cada imagem um ano
const UM_ANO = 365 * 24 * 60 * 60;

export function imagensNoBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Se o endereço é de uma imagem guardada no Vercel Blob (e não na pasta do servidor)
function eDoBlob(endereco) {
  try {
    return new URL(endereco).hostname.endsWith(
      '.public.blob.vercel-storage.com',
    );
  } catch {
    return false;
  }
}

// O multer recebe o ficheiro do formulário (multipart/form-data) e guarda-o em memória, para se
// poder verificar o conteúdo antes de o escrever no disco.
export const receberImagem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
}).single('imagem');

// O tipo diz-se pelos primeiros bytes do ficheiro, e não pelo nome ou pelo que o browser declara,
// que qualquer pessoa pode falsificar.
function extensao(conteudo) {
  if (conteudo[0] === 0xff && conteudo[1] === 0xd8 && conteudo[2] === 0xff) {
    return 'jpg';
  }
  if (conteudo.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'png';
  }
  if (
    conteudo.subarray(0, 4).toString('latin1') === 'RIFF' &&
    conteudo.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

// A largura e a altura de uma imagem JPEG, PNG ou WebP, lidas do cabeçalho do ficheiro, sem a abrir
// toda. Devolve null se não as encontrar.
export function dimensoesDaImagem(conteudo) {
  // PNG: o primeiro bloco (IHDR) tem a largura e a altura
  if (conteudo.length >= 24 && conteudo.toString('latin1', 12, 16) === 'IHDR') {
    return {
      largura: conteudo.readUInt32BE(16),
      altura: conteudo.readUInt32BE(20),
    };
  }
  // WebP: depende do bloco (com perdas, sem perdas ou estendido)
  if (conteudo.length >= 30 && conteudo.toString('latin1', 8, 12) === 'WEBP') {
    const bloco = conteudo.toString('latin1', 12, 16);
    if (bloco === 'VP8 ') {
      return {
        largura: conteudo.readUInt16LE(26) & 0x3fff,
        altura: conteudo.readUInt16LE(28) & 0x3fff,
      };
    }
    if (bloco === 'VP8L') {
      const bits = conteudo.readUInt32LE(21);
      return {
        largura: (bits & 0x3fff) + 1,
        altura: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (bloco === 'VP8X') {
      return {
        largura: conteudo.readUIntLE(24, 3) + 1,
        altura: conteudo.readUIntLE(27, 3) + 1,
      };
    }
  }
  // JPEG: percorre os marcadores até ao início do fotograma (SOF), que tem a altura e a largura
  if (conteudo[0] === 0xff && conteudo[1] === 0xd8) {
    let i = 2;
    while (i + 9 < conteudo.length) {
      if (conteudo[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marcador = conteudo[i + 1];
      const eSof =
        marcador >= 0xc0 &&
        marcador <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marcador);
      if (eSof) {
        return {
          altura: conteudo.readUInt16BE(i + 5),
          largura: conteudo.readUInt16BE(i + 7),
        };
      }
      i += 2 + conteudo.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Guarda a imagem com um nome aleatório (o nome original nunca é usado) e devolve o endereço dela.
// Com "minimo" ({ largura, altura }), recusa imagens mais pequenas (por exemplo, uma capa).
export async function guardarImagem(ficheiro, minimo) {
  if (!ficheiro) {
    throw criarErro(400, 'Escolha uma fotografia');
  }
  const tipo = extensao(ficheiro.buffer);
  if (!tipo) {
    throw criarErro(400, 'A fotografia tem de ser JPEG, PNG ou WebP');
  }
  if (minimo) {
    const dimensoes = dimensoesDaImagem(ficheiro.buffer);
    if (
      !dimensoes ||
      dimensoes.largura < minimo.largura ||
      dimensoes.altura < minimo.altura
    ) {
      throw criarErro(
        400,
        `A imagem tem de ter pelo menos ${minimo.largura} × ${minimo.altura} px`,
      );
    }
  }
  const nome = `${randomUUID()}.${tipo}`;
  if (imagensNoBlob()) {
    const { url } = await put(nome, ficheiro.buffer, {
      access: 'public',
      contentType: TIPOS[tipo],
      cacheControlMaxAge: UM_ANO,
    });
    return url;
  }
  await mkdir(PASTA_UPLOADS, { recursive: true });
  await writeFile(new URL(nome, PASTA_UPLOADS), ficheiro.buffer);
  return `/uploads/${nome}`;
}

// Apaga a imagem antiga. Se já não existir, não faz mal; se o Vercel Blob não responder, fica o
// registo no servidor, e a imagem que sobra não estraga nada (já ninguém aponta para ela).
export async function apagarImagem(endereco) {
  if (eDoBlob(endereco)) {
    await del(endereco).catch((erro) =>
      console.error(`Não foi possível apagar a imagem: ${erro.message}`),
    );
    return;
  }
  const nome = endereco?.match(/^\/uploads\/([\w-]+\.(?:jpg|png|webp))$/)?.[1];
  if (nome) {
    await unlink(new URL(nome, PASTA_UPLOADS)).catch(() => {});
  }
}
