import express from 'express'
import { TenantController } from '../controllers/TenantController.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get all tenants user has access to
router.get('/tenants', authenticateToken, TenantController.getUserTenants)

// Get specific tenant info
router.get('/tenants/:tenantId', authenticateToken, TenantController.getTenantById)

// Get user info for specific tenant (for tenant switching)
router.get('/tenants/:tenantId/user', authenticateToken, TenantController.getTenantUser)

// Create new tenant - allow any authenticated user to create their own workspace
router.post('/tenants', authenticateToken, TenantController.createTenant)

export { router as tenantRoutes }