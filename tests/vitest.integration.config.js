/**
 * Vitest Configuration for Integration Tests
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/integration/**/*.test.js'],
    exclude: ['node_modules/**'],
    testTimeout: 30000, // 30 second timeout for integration tests
    hookTimeout: 30000,
    bail: 1, // Stop on first failure to avoid hanging
    reporter: 'verbose' // More detailed output
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@backend': path.resolve(__dirname, '../backend')
    }
  }
})