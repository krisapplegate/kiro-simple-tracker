import { RBACService } from '../services/RBACService.js'

export class RBACController {
  static async getRoles(req, res) {
    try {
      const roles = await RBACService.getRoles(req.user.effectiveTenantId)
      res.json(roles)
    } catch (error) {
      console.error('Error fetching roles:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createRole(req, res) {
    try {
      const role = await RBACService.createRole(req.body, req.user.effectiveTenantId, req.user.effectiveUserId)
      res.status(201).json(role)
    } catch (error) {
      console.error('Error creating role:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async deleteRole(req, res) {
    try {
      const roleId = parseInt(req.params.roleId)
      
      // Prevent deletion of system roles
      const systemRoles = ['super_admin', 'admin', 'manager', 'operator', 'user', 'viewer']
      const role = await RBACService.getRoleById(roleId, req.user.effectiveTenantId)
      
      if (role && systemRoles.includes(role.name)) {
        return res.status(400).json({ message: 'Cannot delete system roles' })
      }
      
      await RBACService.deleteRole(roleId, req.user.effectiveTenantId)
      res.json({ message: 'Role deleted successfully' })
    } catch (error) {
      console.error('Error deleting role:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getPermissions(req, res) {
    try {
      const permissions = await RBACService.getPermissions()
      res.json(permissions)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getGroups(req, res) {
    try {
      const groups = await RBACService.getGroups(req.user.effectiveTenantId)
      res.json(groups)
    } catch (error) {
      console.error('Error fetching groups:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async createGroup(req, res) {
    try {
      const group = await RBACService.createGroup(req.body, req.user.effectiveTenantId, req.user.effectiveUserId)
      res.status(201).json(group)
    } catch (error) {
      console.error('Error creating group:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async assignRoleToUser(req, res) {
    try {
      const { roleId } = req.body
      const userId = parseInt(req.params.userId)
      
      await RBACService.assignRoleToUser(userId, roleId, req.user.effectiveTenantId, req.user.effectiveUserId)
      res.json({ message: 'Role assigned successfully' })
    } catch (error) {
      console.error('Error assigning role:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async removeRoleFromUser(req, res) {
    try {
      const userId = parseInt(req.params.userId)
      const roleId = parseInt(req.params.roleId)
      
      // Prevent removing the last admin role
      const userRoles = await RBACService.getUserRoles(userId, req.user.effectiveTenantId)
      const adminRoles = userRoles.filter(role => ['super_admin', 'admin'].includes(role.name))
      
      if (adminRoles.length === 1 && adminRoles[0].id === roleId) {
        return res.status(400).json({ message: 'Cannot remove the last admin role from user' })
      }
      
      await RBACService.removeRoleFromUser(userId, roleId, req.user.effectiveTenantId)
      res.json({ message: 'Role removed successfully' })
    } catch (error) {
      console.error('Error removing role:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async addUserToGroup(req, res) {
    try {
      const { userId } = req.body
      const groupId = parseInt(req.params.groupId)
      
      await RBACService.addUserToGroup(userId, groupId, req.user.effectiveTenantId, req.user.effectiveUserId)
      res.json({ message: 'User added to group successfully' })
    } catch (error) {
      console.error('Error adding user to group:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async removeUserFromGroup(req, res) {
    try {
      const userId = parseInt(req.params.userId)
      const groupId = parseInt(req.params.groupId)
      
      await RBACService.removeUserFromGroup(userId, groupId, req.user.effectiveTenantId)
      res.json({ message: 'User removed from group successfully' })
    } catch (error) {
      console.error('Error removing user from group:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }

  static async getUserRBAC(req, res) {
    try {
      const userId = parseInt(req.params.userId)
      const userRBAC = await RBACService.getUserRBAC(userId, req.user.effectiveTenantId)
      res.json(userRBAC)
    } catch (error) {
      console.error('Error fetching user RBAC:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}