import { RBACService } from '../services/RBACService.js'

/**
 * Middleware to check if user has required permission
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const hasPermission = await RBACService.hasPermission(
        req.user.id, 
        req.user.tenantId, 
        permission
      )

      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permission 
        })
      }

      next()
    } catch (error) {
      console.error('RBAC middleware error:', error)
      res.status(500).json({ message: 'Authorization check failed' })
    }
  }
}

/**
 * Middleware to check object access permissions
 */
export const requireObjectAccess = (action = 'read') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      const objectId = req.params.id || req.params.objectId
      if (!objectId) {
        return res.status(400).json({ message: 'Object ID required' })
      }

      const canAccess = await RBACService.canAccessObject(
        req.user.id,
        req.user.tenantId,
        parseInt(objectId),
        action
      )

      if (!canAccess) {
        return res.status(403).json({ 
          message: `Insufficient permissions to ${action} this object` 
        })
      }

      next()
    } catch (error) {
      console.error('Object access middleware error:', error)
      res.status(500).json({ message: 'Authorization check failed' })
    }
  }
}

/**
 * Middleware to check if user can manage other users
 */
export const requireUserManagement = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' })
      }

      // Check if trying to modify another user
      const targetUserId = req.params.userId || req.body.userId
      if (targetUserId && parseInt(targetUserId) !== req.user.id) {
        const hasPermission = await RBACService.hasPermission(
          req.user.id, 
          req.user.tenantId, 
          'users.manage'
        )

        if (!hasPermission) {
          return res.status(403).json({ 
            message: 'Cannot manage other users without proper permissions' 
          })
        }
      }

      next()
    } catch (error) {
      console.error('User management middleware error:', error)
      res.status(500).json({ message: 'Authorization check failed' })
    }
  }
}

/**
 * Middleware to attach user permissions to request
 */
export const attachPermissions = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.permissions = await RBACService.getUserPermissions(
        req.user.id, 
        req.user.tenantId
      )
      req.user.roles = await RBACService.getUserRoles(
        req.user.id, 
        req.user.tenantId
      )
    }
    next()
  } catch (error) {
    console.error('Attach permissions middleware error:', error)
    next() // Continue without permissions if there's an error
  }
}