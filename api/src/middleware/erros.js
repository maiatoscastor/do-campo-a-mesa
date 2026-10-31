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

  const estado = erro.status ?? 500;

  // Os erros internos ficam registados no servidor, mas quem pediu não vê os pormenores
  if (estado >= 500) {
    console.error(erro);
    return res.status(estado).json({ erro: 'Erro interno do servidor' });
  }

  res.status(estado).json({ erro: erro.message });
}
