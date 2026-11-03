import { createBrowserRouter } from 'react-router';
import App from './App.jsx';
import LayoutConta from './components/LayoutConta.jsx';
import LayoutEntrada from './components/LayoutEntrada.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import Carrinho from './pages/Carrinho.jsx';
import DadosPessoais from './pages/DadosPessoais.jsx';
import EditarProduto from './pages/EditarProduto.jsx';
import Encomendas from './pages/Encomendas.jsx';
import Entrar from './pages/Entrar.jsx';
import Inicio from './pages/Inicio.jsx';
import Leiloes from './pages/Leiloes.jsx';
import MeusProdutos from './pages/MeusProdutos.jsx';
import PaginaDeErro from './pages/PaginaDeErro.jsx';
import PaginaNaoEncontrada from './pages/PaginaNaoEncontrada.jsx';
import Produtos from './pages/Produtos.jsx';
import Quinta from './pages/Quinta.jsx';
import Registar from './pages/Registar.jsx';
import ValidarProdutores from './pages/ValidarProdutores.jsx';

// O que um visitante vê nas páginas que exigem conta
const ENCOMENDAS_FECHADAS = {
  pagina: 'Encomendas',
  titulo: 'Entre para ver as suas encomendas',
  texto: 'As suas encomendas e o estado de cada uma aparecem aqui.',
};

const CONTA_FECHADA = {
  pagina: 'A minha conta',
  titulo: 'Entre na sua conta',
  texto: 'Os seus dados aparecem aqui.',
};

// As páginas da aplicação. O App é a estrutura comum (cabeçalho, navegação e rodapé), e a página
// de cada endereço aparece no lugar do <Outlet /> dele. O "*" apanha os endereços que não existem.
// Aberto a todos: início, produtos, leilões e carrinho. Encomendar e licitar é que exigem conta.
export const router = createBrowserRouter([
  {
    // Entrar e criar conta têm uma estrutura própria, sem a navegação da aplicação
    element: <LayoutEntrada />,
    errorElement: <PaginaDeErro />,
    children: [
      { path: 'entrar', element: <Entrar /> },
      { path: 'registar', element: <Registar /> },
    ],
  },
  {
    path: '/',
    element: <App />,
    errorElement: <PaginaDeErro />,
    children: [
      {
        // Um erro numa página aparece dentro da estrutura, com a navegação à mão
        errorElement: <PaginaDeErro />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'produtos', element: <Produtos /> },
          { path: 'leiloes', element: <Leiloes /> },
          { path: 'carrinho', element: <Carrinho /> },
          {
            element: <RotaProtegida fechada={ENCOMENDAS_FECHADAS} />,
            children: [{ path: 'encomendas', element: <Encomendas /> }],
          },
          {
            // A minha conta: uma secção por separador, e cada papel só vê as suas
            element: <RotaProtegida fechada={CONTA_FECHADA} />,
            children: [
              {
                path: 'conta',
                element: <LayoutConta />,
                children: [
                  { index: true, element: <DadosPessoais /> },
                  {
                    element: <RotaProtegida papeis={['produtor']} />,
                    children: [
                      { path: 'quinta', element: <Quinta /> },
                      { path: 'produtos', element: <MeusProdutos /> },
                      { path: 'produtos/novo', element: <EditarProduto /> },
                      { path: 'produtos/:id', element: <EditarProduto /> },
                    ],
                  },
                  {
                    element: <RotaProtegida papeis={['admin']} />,
                    children: [
                      { path: 'produtores', element: <ValidarProdutores /> },
                    ],
                  },
                ],
              },
            ],
          },
          { path: '*', element: <PaginaNaoEncontrada /> },
        ],
      },
    ],
  },
]);
