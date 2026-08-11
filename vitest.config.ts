import { defineConfig, defaultExclude } from 'vitest/config';
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
    exclude: [...defaultExclude, '**/*.e2e.test.ts', '.stryker-tmp/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        // Aggregate thresholds across all files. Fail CI when coverage drops
        // below these. Keep a comfortable buffer below current numbers to
        // tolerate small fluctuations while still catching regressions.
        statements: 55,
        branches: 45,
        functions: 55,
        lines: 55,
      },
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