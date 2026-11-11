import { createBrowserRouter, Navigate } from 'react-router';
import App from './App.jsx';
import ACarregar from './components/ACarregar.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import Carrinho from './pages/Carrinho.jsx';
import Inicio from './pages/Inicio.jsx';
import Leiloes from './pages/Leiloes.jsx';
import PaginaDeErro from './pages/PaginaDeErro.jsx';
import PaginaNaoEncontrada from './pages/PaginaNaoEncontrada.jsx';
import Produtos from './pages/Produtos.jsx';

// Uma página que só se descarrega quando é aberta pela primeira vez: o código dela fica num ficheiro
// à parte, e quem nunca a abre (um visitante não abre a conta do produtor, por exemplo) não o
// descarrega. O React Router espera pelo ficheiro antes de mostrar a página. Ficam no ficheiro
// principal só as páginas por onde se entra na aplicação.
function aPedido(carregar) {
  return { lazy: async () => ({ Component: (await carregar()).default }) };
}

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
    ...aPedido(() => import('./components/LayoutEntrada.jsx')),
    errorElement: <PaginaDeErro />,
    hydrateFallbackElement: <ACarregar />,
    children: [
      { path: 'entrar', ...aPedido(() => import('./pages/Entrar.jsx')) },
      { path: 'registar', ...aPedido(() => import('./pages/Registar.jsx')) },
    ],
  },
  {
    path: '/',
    element: <App />,
    errorElement: <PaginaDeErro />,
    hydrateFallbackElement: <ACarregar />,
    children: [
      {
        // Um erro numa página aparece dentro da estrutura, com a navegação à mão
        errorElement: <PaginaDeErro />,
        children: [
          { index: true, element: <Inicio /> },
          { path: 'produtos', element: <Produtos /> },
          { path: 'leiloes', element: <Leiloes /> },
          {
            path: 'leiloes/:id',
            ...aPedido(() => import('./pages/SalaLeilao.jsx')),
          },
          {
            path: 'produtores',
            ...aPedido(() => import('./pages/Produtores.jsx')),
          },
          {
            path: 'produtores/:id',
            ...aPedido(() => import('./pages/PaginaProdutor.jsx')),
          },
          {
            path: 'produtores/:id/avaliacoes',
            ...aPedido(() => import('./pages/AvaliacoesProdutor.jsx')),
          },
          { path: 'carrinho', element: <Carrinho /> },
          {
            element: <RotaProtegida fechada={ENCOMENDAS_FECHADAS} />,
            children: [
              {
                path: 'encomendas',
                ...aPedido(() => import('./pages/Encomendas.jsx')),
              },
              {
                path: 'encomendas/:id/avaliar',
                ...aPedido(() => import('./pages/AvaliarEncomenda.jsx')),
              },
            ],
          },
          {
            element: <RotaProtegida />,
            children: [
              {
                path: 'notificacoes',
                ...aPedido(() => import('./pages/Notificacoes.jsx')),
              },
            ],
          },
          {
            // A minha conta: uma secção por separador, e cada papel só vê as suas
            element: <RotaProtegida fechada={CONTA_FECHADA} />,
            children: [
              {
                path: 'conta',
                ...aPedido(() => import('./components/LayoutConta.jsx')),
                children: [
                  {
                    index: true,
                    ...aPedido(() => import('./pages/DadosPessoais.jsx')),
                  },
                  {
                    element: <RotaProtegida papeis={['produtor']} />,
                    children: [
                      {
                        path: 'quinta',
                        ...aPedido(() => import('./pages/MinhaPagina.jsx')),
                      },
                      {
                        path: 'produtos',
                        ...aPedido(() => import('./pages/MeusProdutos.jsx')),
                      },
                      {
                        path: 'produtos/novo',
                        ...aPedido(() => import('./pages/EditarProduto.jsx')),
                      },
                      {
                        path: 'produtos/:id',
                        ...aPedido(() => import('./pages/EditarProduto.jsx')),
                      },
                      {
                        path: 'encomendas',
                        ...aPedido(
                          () => import('./pages/EncomendasRecebidas.jsx'),
                        ),
                      },
                      {
                        path: 'leiloes',
                        ...aPedido(() => import('./pages/MeusLeiloes.jsx')),
                      },
                      {
                        path: 'estatisticas',
                        ...aPedido(() => import('./pages/Estatisticas.jsx')),
                      },
                      {
                        path: 'leiloes/novo',
                        ...aPedido(() => import('./pages/NovoLeilao.jsx')),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            // A administração: à parte da conta, só para administradores
            element: <RotaProtegida papeis={['admin']} />,
            children: [
              {
                path: 'admin',
                ...aPedido(() => import('./components/LayoutAdmin.jsx')),
                children: [
                  {
                    index: true,
                    element: <Navigate to="painel" replace />,
                  },
                  {
                    path: 'painel',
                    ...aPedido(() => import('./pages/PainelAdmin.jsx')),
                  },
                  {
                    path: 'produtores',
                    ...aPedido(() => import('./pages/ValidarProdutores.jsx')),
                  },
                  {
                    path: 'denuncias',
                    ...aPedido(() => import('./pages/Denuncias.jsx')),
                  },
                  {
                    path: 'servicos',
                    ...aPedido(() => import('./pages/Servicos.jsx')),
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
