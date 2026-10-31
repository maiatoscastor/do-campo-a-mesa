// Aparece quando uma página dá um erro inesperado, em vez de um ecrã em branco ou de uma mensagem
// técnica (os pormenores ficam na consola do browser). A ligação é um <a> normal de propósito:
// recarrega a aplicação e limpa o estado que possa ter causado o erro.
export default function PaginaDeErro() {
  return (
    <section className="text-center py-5 px-3">
      <title>Algo correu mal · Do Campo à Mesa</title>
      <h1>Algo correu mal</h1>
      <p className="text-body-secondary">
        Não foi possível mostrar esta página. Tente novamente daqui a pouco.
      </p>
      <a className="btn btn-primary" href="/">
        Voltar ao início
      </a>
    </section>
  );
}
