import InicioAdministrador from '../components/InicioAdministrador.jsx';
import InicioLoja from '../components/InicioLoja.jsx';
import InicioProdutor from '../components/InicioProdutor.jsx';
import { useSessao } from '../hooks/useSessao.js';

// Página inicial: é aqui que a aplicação abre, com ou sem sessão, e cada perfil vê o que lhe
// interessa. O visitante e o comprador veem a loja (a pesquisa, o leilão em destaque, as
// categorias, os produtos da época, os leilões e os produtores; o comprador também as encomendas);
// o produtor e o administrador, um painel com o que precisa da atenção deles e os números.
export default function Inicio() {
  const { utilizador } = useSessao();

  let conteudo = <InicioLoja />;
  if (utilizador?.papel === 'produtor') {
    conteudo = <InicioProdutor />;
  } else if (utilizador?.papel === 'admin') {
    conteudo = <InicioAdministrador />;
  }

  return (
    <>
      <title>Do Campo à Mesa</title>
      {conteudo}
    </>
  );
}
