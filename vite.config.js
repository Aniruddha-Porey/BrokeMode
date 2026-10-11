import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', allowedHosts: true },
  preview: { host: '0.0.0.0', allowedHosts: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/finance/calculations.js',
        'src/finance/validation.js',
        'src/reducer/financeReducer.js',
        'src/utils/csv.js',
      ],
      thresholds: {
        statements: 90,
        branches: 75,
        functions: 95,
        lines: 95,
        'src/finance/calculations.js': { statements: 90, branches: 60, functions: 90, lines: 93 },
        'src/finance/validation.js': { statements: 88, branches: 80, functions: 100, lines: 100 },
        'src/reducer/financeReducer.js': { statements: 88, branches: 85, functions: 100, lines: 95 },
        'src/utils/csv.js': { statements: 100, branches: 90, functions: 100, lines: 100 },
      },
    },
  },
});
