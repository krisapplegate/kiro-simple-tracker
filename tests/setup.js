/**
 * Test Setup File
 * Global setup for all tests
 */

import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...')
  
  // Ensure test database is ready
  try {
    // Check if containers are running
    execSync('docker-compose ps', { stdio: 'pipe' })
    console.log('✅ Docker containers are running')
  } catch (error) {
    console.log('🚀 Starting Docker containers...')
    execSync('./docker-start.sh dev', { stdio: 'inherit' })
  }
  
  // Wait for services to be ready
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('✅ Test environment ready')
})

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...')
  
  // Clean up test data if needed
  // Note: In a real environment, you might want to clean up test users/roles
  // For now, we'll leave the data for manual inspection
  
  console.log('✅ Test cleanup complete')
})

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: process.env.NODE_ENV === 'test' ? () => {} : console.log,
  debug: process.env.NODE_ENV === 'test' ? () => {} : console.debug,
  info: process.env.NODE_ENV === 'test' ? () => {} : console.info,
  warn: console.warn,
  error: console.error
}

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key'
process.env.DB_NAME = 'location_tracker_test'