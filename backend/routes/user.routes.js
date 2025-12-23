import express from 'express'
import { UserController } from '../controllers/UserController.js'
import { authenticateToken } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'

const router = express.Router()

// Get all users for admin management
router.get('/users', authenticateToken, requirePermission('users.read'), UserController.getUsers)

// Create new user
router.post('/users', authenticateToken, requirePermission('users.create'), UserController.createUser)

export { router as userRoutes }