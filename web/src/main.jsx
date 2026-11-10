import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
// Fontes guardadas no projeto: o browser não as vai buscar ao Google Fonts (RGPD)
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/main.scss';
import CarrinhoProvider from './context/CarrinhoProvider.jsx';
import NotificacoesProvider from './context/NotificacoesProvider.jsx';
import SessaoProvider from './context/SessaoProvider.jsx';
import SocketProvider from './context/SocketProvider.jsx';
import { router } from './rotas.jsx';

// Ponto de entrada da SPA: monta a aplicação React dentro de <div id="root"> do index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessaoProvider>
      <SocketProvider>
        <NotificacoesProvider>
          <CarrinhoProvider>
            <RouterProvider router={router} />
          </CarrinhoProvider>
        </NotificacoesProvider>
      </SocketProvider>
    </SessaoProvider>
  </StrictMode>,
);
