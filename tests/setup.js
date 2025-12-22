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
  // Store original console methods
  const originalConsole = { ...console }
  
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {}, // Also suppress warnings in tests
    error: () => {}, // Suppress error logs from intentional test errors
    // Keep these for actual test framework output
    group: originalConsole.group,
    groupEnd: originalConsole.groupEnd,
    time: originalConsole.time,
    timeEnd: originalConsole.timeEnd
  }
}