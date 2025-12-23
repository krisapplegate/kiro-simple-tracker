/**
 * Vitest Configuration for Unit Tests
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js', './tests/setup-react.js'],
    include: ['tests/unit/**/*.test.js', 'tests/unit/**/*.test.jsx'],
    exclude: ['tests/integration/**/*.test.js', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.test.js',
        '**/*.spec.js',
        '**/*.test.jsx'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@backend': path.resolve(__dirname, '../backend')
    }
  }
})