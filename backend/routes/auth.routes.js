import express from 'express'
import { AuthController } from '../controllers/AuthController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Health check
router.get('/health', AuthController.healthCheck)

// Auth routes
router.post('/auth/login', AuthController.login)
router.get('/auth/validate', authenticateToken, AuthController.validateToken)

export { router as authRoutes }