import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/contracts/**',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/contracts/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/setupTests.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Use browser build of OpenPGP in jsdom test environment
      'openpgp': path.resolve(__dirname, './node_modules/openpgp/dist/openpgp.mjs'),
    },
  },
});
