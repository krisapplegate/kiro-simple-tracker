import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import dotenv from 'dotenv'

// Import routes
import { authRoutes } from './routes/auth.routes.js'
import { tenantRoutes } from './routes/tenant.routes.js'
import { adminRoutes } from './routes/admin.routes.js'
import { rbacRoutes } from './routes/rbac.routes.js'
import { userRoutes } from './routes/user.routes.js'
import { objectRoutes } from './routes/object.routes.js'

// Import WebSocket manager
import { WebSocketManager } from './websocket/WebSocketManager.js'

// Import middleware
import { attachPermissions } from './middleware/rbac.js'

dotenv.config()

const app = express()
const server = createServer(app)

// Initialize WebSocket manager
const wsManager = new WebSocketManager(server)

// Make WebSocket manager available to controllers
app.locals.wsManager = wsManager

// Middleware
app.use(cors())
app.use(express.json())

// Attach permissions middleware globally for authenticated routes
app.use('/api', attachPermissions)

// Routes
app.use('/api', authRoutes)
app.use('/api', tenantRoutes)
app.use('/api', adminRoutes)
app.use('/api', rbacRoutes)
app.use('/api', userRoutes)
app.use('/api', objectRoutes)

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' })
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ message: 'Only image files are allowed' })
  }
  
  res.status(500).json({ message: 'Internal server error' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`WebSocket server initialized`)
})

export { app, server, wsManager }