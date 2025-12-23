import { User } from '../models/User.js'
import { Tenant } from '../models/Tenant.js'
import { RBACService } from '../services/RBACService.js'
import { query } from '../database.js'

export class TenantController {
  static async getUserTenants(req, res) {
    try {
      const tenants = await User.getUserTenants(req.user.id)
      res.json(tenants)
    } catch (error) {
      console.error('Error fetching user tenants:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getTenantById(req, res) {
    try {
      const tenantId = parseInt(req.params.tenantId)
      
      // Verify user has access to this tenant
      const userTenants = await User.getUserTenants(req.user.id)
      const hasAccess = userTenants.some(t => t.id === tenantId)
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' })
      }
      
      const tenant = await Tenant.findById(tenantId)
      if (!tenant) {
        return res.status(404).json({ message: 'Workspace not found' })
      }
      
      res.json(tenant)
    } catch (error) {
      console.error('Error fetching tenant:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getTenantUser(req, res) {
    try {
      const tenantId = parseInt(req.params.tenantId)
      
      // Verify user has access to this tenant
      const userTenants = await User.getUserTenants(req.user.id)
      const hasAccess = userTenants.some(t => t.id === tenantId)
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this workspace' })
      }
      
      // Get user info for this specific tenant
      const user = await User.findByEmailAndTenant(req.user.email, tenantId)
      if (!user) {
        return res.status(404).json({ message: 'User not found in this workspace' })
      }
      
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      })
    } catch (error) {
      console.error('Error fetching tenant user:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createTenant(req, res) {
    try {
      const { name } = req.body
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Workspace name is required' })
      }
      
      // Create the tenant
      const tenant = await Tenant.create({
        name: name.trim(),
        created_by: req.user.id
      })
      
      // Initialize RBAC for the new tenant
      await RBACService.initializeTenantRBAC(tenant.id)
      
      // Create user record in new tenant with super_admin role
      const superAdminRole = await RBACService.getRoleByName('super_admin', tenant.id)
      
      const newUser = await User.create({
        email: req.user.email,
        password_hash: '', // Will be set when user logs in to this tenant
        role: 'super_admin',
        tenant_id: tenant.id,
        created_by: req.user.id
      })
      
      // Assign super_admin role to the user
      if (superAdminRole) {
        await RBACService.assignRoleToUser(newUser.id, superAdminRole.id, tenant.id, req.user.id)
      }
      
      res.status(201).json({
        id: tenant.id,
        name: tenant.name,
        created_at: tenant.created_at,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        }
      })
    } catch (error) {
      console.error('Error creating tenant:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}