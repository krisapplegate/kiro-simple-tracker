#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Starting Location Tracker Development Environment...\n')

// Start backend
console.log('📡 Starting backend server...')
const backend = spawn('node', ['backend/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
})

// Start frontend after a short delay
setTimeout(() => {
  console.log('🌐 Starting frontend development server...')
  const frontend = spawn('npm', ['run', 'dev:frontend'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  })

  frontend.on('error', (err) => {
    console.error('Frontend error:', err)
  })
}, 2000)

backend.on('error', (err) => {
  console.error('Backend error:', err)
})

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development servers...')
  backend.kill()
  process.exit(0)
})

console.log('\n✅ Development environment started!')
console.log('📱 Frontend: http://localhost:3000')
console.log('🔧 Backend API: http://localhost:3001')
console.log('🔑 Demo login: admin@demo.com / password')
console.log('\nPress Ctrl+C to stop all servers\n')