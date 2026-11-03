import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // O Vite passa os pedidos a /api à API local. Para o browser, a aplicação e a API ficam no mesmo
    // endereço, por isso também funciona no telemóvel, onde "localhost" seria o próprio telemóvel.
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // O Bootstrap 5.3 usa funcionalidades que o Sass marcou como obsoletas (@import, if()…),
        // e cada build mostrava centenas de avisos. Escondem-se só os das dependências:
        // os avisos sobre o nosso código continuam a aparecer.
        quietDeps: true,
      },
    },
  },
});
