import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
// Fontes guardadas no projeto: o browser não as vai buscar ao Google Fonts (RGPD)
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/plus-jakarta-sans';
import './styles/main.scss';
import SessaoProvider from './context/SessaoProvider.jsx';
import { router } from './rotas.jsx';

// Ponto de entrada da SPA: monta a aplicação React dentro de <div id="root"> do index.html
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessaoProvider>
      <RouterProvider router={router} />
    </SessaoProvider>
  </StrictMode>,
);
