import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? (process.env.PAGES_BASE_PATH || '/') : '/',
  build: { target: ['es2020', 'safari14'], cssTarget: 'safari14' },
}));
