import { createBrowserRouter } from 'react-router';
import App from './App.jsx';
import Carrinho from './pages/Carrinho.jsx';
import Encomendas from './pages/Encomendas.jsx';
import Inicio from './pages/Inicio.jsx';
import Leiloes from './pages/Leiloes.jsx';
import PaginaNaoEncontrada from './pages/PaginaNaoEncontrada.jsx';
import Produtos from './pages/Produtos.jsx';

// As páginas da aplicação. O App é a estrutura comum (cabeçalho, navegação e rodapé), e a página
// de cada endereço aparece no lugar do <Outlet /> dele. O "*" apanha os endereços que não existem.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'produtos', element: <Produtos /> },
      { path: 'leiloes', element: <Leiloes /> },
      { path: 'carrinho', element: <Carrinho /> },
      { path: 'encomendas', element: <Encomendas /> },
      { path: '*', element: <PaginaNaoEncontrada /> },
    ],
  },
]);
