import { Tenant } from '../models/Tenant.js'
import { TrackedObject } from '../models/TrackedObject.js'
import { query } from '../database.js'

export class AdminController {
  static async getAllTenants(req, res) {
    try {
      const tenants = await Tenant.findAll()
      
      // Get statistics for each tenant
      const tenantsWithStats = await Promise.all(tenants.map(async (tenant) => {
        const stats = await query(`
          SELECT 
            (SELECT COUNT(*) FROM users WHERE tenant_id = $1) as user_count,
            (SELECT COUNT(*) FROM objects WHERE tenant_id = $1) as object_count,
            (SELECT COUNT(*) FROM location_history WHERE tenant_id = $1) as location_history_count
        `, [tenant.id])
        
        return {
          ...tenant,
          stats: stats.rows[0]
        }
      }))
      
      res.json(tenantsWithStats)
    } catch (error) {
      console.error('Error fetching tenants:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getAllObjects(req, res) {
    try {
      const result = await query(`
        SELECT o.*, t.name as tenant_name, u.email as created_by_email
        FROM objects o
        LEFT JOIN tenants t ON o.tenant_id = t.id
        LEFT JOIN users u ON o.created_by = u.id
        ORDER BY o.created_at DESC
      `)
      
      res.json(result.rows)
    } catch (error) {
      console.error('Error fetching all objects:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getTenantObjects(req, res) {
    try {
      const tenantId = parseInt(req.params.tenantId)
      
      const objects = await TrackedObject.findByTenant(tenantId)
      res.json(objects)
    } catch (error) {
      console.error('Error fetching tenant objects:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteTenant(req, res) {
    try {
      const tenantId = parseInt(req.params.tenantId)
      
      // Prevent deletion of default tenant
      if (tenantId === 1) {
        return res.status(400).json({ message: 'Cannot delete default workspace' })
      }
      
      // Check if tenant exists
      const tenant = await Tenant.findById(tenantId)
      if (!tenant) {
        return res.status(404).json({ message: 'Workspace not found' })
      }
      
      // Delete tenant (CASCADE will handle related data)
      await Tenant.delete(tenantId)
      
      res.json({ message: 'Workspace and all associated data deleted successfully' })
    } catch (error) {
      console.error('Error deleting tenant:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteObject(req, res) {
    try {
      const objectId = parseInt(req.params.objectId)
      
      // Check if object exists
      const result = await query('SELECT * FROM objects WHERE id = $1', [objectId])
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Object not found' })
      }
      
      // Delete object (CASCADE will handle location_history and images)
      await query('DELETE FROM objects WHERE id = $1', [objectId])
      
      res.json({ message: 'Object deleted successfully' })
    } catch (error) {
      console.error('Error deleting object:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}