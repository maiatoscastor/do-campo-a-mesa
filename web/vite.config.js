import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
