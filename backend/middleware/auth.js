import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Auth middleware with RBAC
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }
    
    req.user = user
    
    // Check for tenant ID in custom header (for workspace switching)
    const headerTenantId = req.headers['x-tenant-id'] ? parseInt(req.headers['x-tenant-id']) : null
    // Check if there's a tenant ID in the path (for tenant-specific API calls)
    const pathTenantId = req.params.tenantId ? parseInt(req.params.tenantId) : null
    let effectiveTenantId = user.tenantId // Default to JWT tenant ID
    
    if (headerTenantId || pathTenantId) {
      const requestedTenantId = headerTenantId || pathTenantId
      
      // Verify user has access to the requested tenant
      try {
        const userTenants = await User.getUserTenants(user.id)
        const hasAccess = userTenants.some(t => t.id === requestedTenantId)
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied to this workspace' })
        }
        
        effectiveTenantId = requestedTenantId
      } catch (error) {
        console.error('Error checking tenant access:', error)
        return res.status(500).json({ message: 'Server error' })
      }
    }
    
    // Use effective tenant ID for permissions
    req.user.effectiveTenantId = effectiveTenantId
    
    // Attach permissions and roles to user for the effective tenant
    try {
      // For multi-tenant API calls, we need to get the user ID for the specific tenant
      let effectiveUserId = user.id
      
      if (effectiveTenantId !== user.tenantId) {
        // Find the user record for this tenant
        const tenantUser = await User.findByEmailAndTenant(user.email, effectiveTenantId)
        if (tenantUser) {
          effectiveUserId = tenantUser.id
        }
      }
      
      req.user.effectiveUserId = effectiveUserId
      
      // Get user permissions for the effective tenant
      const userWithPermissions = await User.getUserWithPermissions(effectiveUserId, effectiveTenantId)
      req.user.permissions = userWithPermissions.permissions || []
      req.user.roles = userWithPermissions.roles || []
    } catch (error) {
      console.error('Error attaching permissions:', error)
      // Continue without permissions - they'll be checked by permission middleware
    }
    
    next()
  })
}