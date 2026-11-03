import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import multer from 'multer';
import { criarErro } from './erro.js';

// Fotografias dos produtos. Em desenvolvimento ficam na pasta api/uploads (fora do Git); na
// publicação, passam para um storage na Cloud.
export const PASTA_UPLOADS = new URL('../../uploads/', import.meta.url);
const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB

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

// Guarda a imagem com um nome aleatório (o nome original nunca é usado) e devolve o endereço dela
export async function guardarImagem(ficheiro) {
  if (!ficheiro) {
    throw criarErro(400, 'Escolha uma fotografia');
  }
  const tipo = extensao(ficheiro.buffer);
  if (!tipo) {
    throw criarErro(400, 'A fotografia tem de ser JPEG, PNG ou WebP');
  }
  await mkdir(PASTA_UPLOADS, { recursive: true });
  const nome = `${randomUUID()}.${tipo}`;
  await writeFile(new URL(nome, PASTA_UPLOADS), ficheiro.buffer);
  return `/uploads/${nome}`;
}

// Apaga a imagem antiga. Se já não existir, não faz mal.
export async function apagarImagem(endereco) {
  const nome = endereco?.match(/^\/uploads\/([\w-]+\.(?:jpg|png|webp))$/)?.[1];
  if (nome) {
    await unlink(new URL(nome, PASTA_UPLOADS)).catch(() => {});
  }
}
