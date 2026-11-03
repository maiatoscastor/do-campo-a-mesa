import { detalhesDeValidacao } from '../utils/erro.js';

// Responde aos pedidos que não correspondem a nenhuma rota
export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: 'Recurso não encontrado' });
}

// Trata todos os erros num único sítio. O Express reconhece um tratador de erros por ter 4
// argumentos, e no Express 5 os erros das funções async também chegam aqui sozinhos.
export function tratarErros(erro, req, res, next) {
  // Se a resposta já começou a ser enviada, só o Express a pode terminar
  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ erro: 'O corpo do pedido não é JSON válido' });
  }

  if (erro.name === 'ValidationError') {
    return res
      .status(400)
      .json({ erro: 'Dados inválidos', detalhes: detalhesDeValidacao(erro) });
  }

  // Erros ao receber uma fotografia (por exemplo, um ficheiro grande demais)
  if (erro.name === 'MulterError') {
    const mensagem =
      erro.code === 'LIMIT_FILE_SIZE'
        ? 'A fotografia não pode ter mais de 5 MB'
        : 'Não foi possível receber a fotografia';
    return res.status(400).json({ erro: mensagem });
  }

  // Por exemplo, um identificador com um formato que não é o do MongoDB
  if (erro.name === 'CastError') {
    return res.status(400).json({ erro: 'Identificador ou valor inválido' });
  }

  // Índice único: já existe um documento com esse valor
  if (erro.code === 11000) {
    return res
      .status(409)
      .json({ erro: 'Já existe um registo com esses dados' });
  }

  const estado = erro.status ?? 500;

  // Os erros internos ficam registados no servidor, mas quem pediu não vê os pormenores
  if (estado >= 500) {
    console.error(erro);
    return res.status(estado).json({ erro: 'Erro interno do servidor' });
  }

  res.status(estado).json({ erro: erro.message, detalhes: erro.detalhes });
}
