import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'AWESOME_');
  const target = env.AWESOME_API_ORIGIN || 'http://127.0.0.1:3510';
  return {
    server: { proxy: { '/api': { target, changeOrigin: false } } },
    preview: { proxy: { '/api': { target, changeOrigin: false } } },
    test: { include: ['tests/*.test.ts'] },
  };
});
