import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // Note: React plugin not needed for WebRTC manager tests
  // We're testing class-based managers, not React components
  // If needed for component tests later, uncomment:
  // plugins: [react()],
  test: {
    globals: true, // Use global APIs (describe, it, expect)
    environment: 'jsdom', // Browser-like environment
    setupFiles: ['./tests/setup.ts'], // Setup file for each test
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '.next/',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      include: ['**/*.{ts,tsx}'],
    },
    // Include patterns
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // Exclude patterns
    exclude: ['node_modules', 'dist', '.next', 'coverage'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

