import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    restoreMocks: true,
    clearMocks: true,
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test-setup.ts',
      ]
    }
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/@core'),
      '@ui': path.resolve(__dirname, 'src/@ui')
    }
  }
});