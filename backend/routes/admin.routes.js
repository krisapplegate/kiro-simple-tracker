import express from 'express'
import { AdminController } from '../controllers/AdminController.js'
import { authenticateToken } from '../middleware/auth.js'
import { requirePermission } from '../middleware/rbac.js'

const router = express.Router()

// Super Admin: Get all tenants with statistics
router.get('/admin/tenants', authenticateToken, requirePermission('system.admin'), AdminController.getAllTenants)

// Super Admin: Get all objects across all tenants
router.get('/admin/objects', authenticateToken, requirePermission('system.admin'), AdminController.getAllObjects)

// Super Admin: Get objects for specific tenant
router.get('/admin/tenants/:tenantId/objects', authenticateToken, requirePermission('system.admin'), AdminController.getTenantObjects)

// Super Admin: Delete tenant and all its data
router.delete('/admin/tenants/:tenantId', authenticateToken, requirePermission('system.admin'), AdminController.deleteTenant)

// Super Admin: Delete specific object
router.delete('/admin/objects/:objectId', authenticateToken, requirePermission('system.admin'), AdminController.deleteObject)

export { router as adminRoutes }