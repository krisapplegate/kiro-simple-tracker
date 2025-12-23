import express from 'express'
import { RBACController } from '../controllers/RBACController.js'
import { authenticateToken } from '../middleware/auth.js'
import { requirePermission, requireUserManagement } from '../middleware/rbac.js'

const router = express.Router()

// Get all roles for tenant
router.get('/rbac/roles', authenticateToken, requirePermission('roles.read'), RBACController.getRoles)

// Create new role
router.post('/rbac/roles', authenticateToken, requirePermission('roles.create'), RBACController.createRole)

// Delete role
router.delete('/rbac/roles/:roleId', authenticateToken, requirePermission('roles.delete'), RBACController.deleteRole)

// Get all permissions
router.get('/rbac/permissions', authenticateToken, requirePermission('roles.read'), RBACController.getPermissions)

// Get all groups for tenant
router.get('/rbac/groups', authenticateToken, requirePermission('groups.read'), RBACController.getGroups)

// Create new group
router.post('/rbac/groups', authenticateToken, requirePermission('groups.create'), RBACController.createGroup)

// Assign role to user
router.post('/rbac/users/:userId/roles', authenticateToken, requireUserManagement(), RBACController.assignRoleToUser)

// Remove role from user
router.delete('/rbac/users/:userId/roles/:roleId', authenticateToken, requireUserManagement(), RBACController.removeRoleFromUser)

// Add user to group
router.post('/rbac/groups/:groupId/users', authenticateToken, requirePermission('groups.update'), RBACController.addUserToGroup)

// Remove user from group
router.delete('/rbac/groups/:groupId/users/:userId', authenticateToken, requirePermission('groups.update'), RBACController.removeUserFromGroup)

// Get user's permissions and roles
router.get('/rbac/users/:userId', authenticateToken, requireUserManagement(), RBACController.getUserRBAC)

export { router as rbacRoutes }