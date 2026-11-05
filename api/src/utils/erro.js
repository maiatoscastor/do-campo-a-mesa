// Cria um erro com um código HTTP, que o tratador de erros transforma na resposta certa.
// Uso nas rotas: throw criarErro(404, 'Produtor não encontrado');
export function criarErro(estado, mensagem) {
  return Object.assign(new Error(mensagem), { status: estado });
}

// Converte um erro de validação do Mongoose em { campo: mensagem }, para os formulários poderem
// mostrar cada mensagem ao lado do campo certo ("produtor.localidade" passa a "localidade")
export function detalhesDeValidacao(erro) {
  const detalhes = Object.entries(erro.errors).map(([campo, problema]) => [
    campo.split('.').at(-1),
    problema.message,
  ]);
  return Object.fromEntries(detalhes);
}

// Valida um documento antes de o gravar e devolve os problemas, em vez de parar no primeiro erro.
// Os campos em "saltar" ficam de fora (por exemplo, os que a rota verifica de outra forma).
export async function problemasDe(documento, saltar = []) {
  try {
    await documento.validate({ pathsToSkip: saltar });
    return {};
  } catch (erro) {
    if (erro.name !== 'ValidationError') {
      throw erro;
    }
    return detalhesDeValidacao(erro);
  }
}

// O campo do hash fica de fora: só se calcula depois de o resto estar certo, porque é lento
export function problemasDeUtilizador(utilizador) {
  return problemasDe(utilizador, ['passwordHash']);
}
