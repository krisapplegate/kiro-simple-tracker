/**
 * Test Setup File
 * Global setup for all tests
 */

import { beforeAll, afterAll } from 'vitest'

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key'
  
  // Database configuration for tests
  if (!process.env.DB_HOST) {
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5432'
    process.env.DB_NAME = 'location_tracker_test'
    process.env.DB_USER = 'tracker_user'
    process.env.DB_PASSWORD = 'tracker_password'
  }
  
  console.log('✅ Test environment configured')
})

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...')
  // Add any cleanup logic here if needed
})

// Mock console methods in tests to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: console.warn,
    error: console.error
  }
}