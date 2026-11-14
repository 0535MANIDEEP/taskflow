import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1234,
    // The API runs on its own port in development, so the browser has to be
    // told where it is. The proxy forwards /api to it, which means the front
    // end calls a relative path in development and in production alike, and
    // there is no environment variable to keep in step between the two.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The forks pool times out spawning workers on Windows.
    pool: 'threads',
  },
});
