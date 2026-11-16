import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/react',
  base: './',
  build: {
    outDir: resolve(process.cwd(), 'public'),
    emptyOutDir: false
  }
});
