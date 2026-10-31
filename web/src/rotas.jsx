import { createBrowserRouter } from 'react-router';
import App from './App.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import Carrinho from './pages/Carrinho.jsx';
import Conta from './pages/Conta.jsx';
import Encomendas from './pages/Encomendas.jsx';
import Entrar from './pages/Entrar.jsx';
import Inicio from './pages/Inicio.jsx';
import Leiloes from './pages/Leiloes.jsx';
import PaginaDeErro from './pages/PaginaDeErro.jsx';
import PaginaNaoEncontrada from './pages/PaginaNaoEncontrada.jsx';
import Produtos from './pages/Produtos.jsx';
import Registar from './pages/Registar.jsx';

// As páginas da aplicação. O App é a estrutura comum (cabeçalho, navegação e rodapé), e a página
// de cada endereço aparece no lugar do <Outlet /> dele. O "*" apanha os endereços que não existem.
export const router = createBrowserRouter([
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
          { path: 'entrar', element: <Entrar /> },
          { path: 'registar', element: <Registar /> },
          {
            // Páginas que exigem sessão iniciada
            element: <RotaProtegida />,
            children: [
              { path: 'encomendas', element: <Encomendas /> },
              { path: 'conta', element: <Conta /> },
            ],
          },
          { path: '*', element: <PaginaNaoEncontrada /> },
        ],
      },
    ],
  },
]);
