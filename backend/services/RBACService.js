import { query } from '../database.js'
import { PermissionService } from './PermissionService.js'
import { RoleService } from './RoleService.js'
import { GroupService } from './GroupService.js'

export class RBACService {
  // Re-export methods from specialized services for backward compatibility
  static async getUserPermissions(userId, tenantId) {
    return PermissionService.getUserPermissions(userId, tenantId)
  }

  static async hasPermission(userId, tenantId, permissionName) {
    return PermissionService.hasPermission(userId, tenantId, permissionName)
  }

  static async canAccessObject(userId, tenantId, objectId, action = 'read') {
    return PermissionService.canAccessObject(userId, tenantId, objectId, action)
  }

  static async getUserRoles(userId, tenantId) {
    return RoleService.getUserRoles(userId, tenantId)
  }

  static async assignRoleToUser(userId, roleId, assignedBy) {
    return RoleService.assignRoleToUser(userId, roleId, assignedBy)
  }

  static async removeRoleFromUser(userId, roleId) {
    const result = await RoleService.removeRoleFromUser(userId, roleId)
    return result !== null
  }

  static async createRole(roleData, tenantId, createdBy) {
    return RoleService.createRole(roleData, tenantId, createdBy)
  }

  static async getRoles(tenantId) {
    return RoleService.getRoles(tenantId)
  }

  static async deleteRole(roleId, tenantId) {
    return RoleService.deleteRole(roleId, tenantId)
  }

  static async getPermissions() {
    return PermissionService.getPermissions()
  }

  static async createGroup(groupData, tenantId, createdBy) {
    return GroupService.createGroup(groupData, tenantId, createdBy)
  }

  static async getGroups(tenantId) {
    return GroupService.getGroups(tenantId)
  }

  static async addUserToGroup(userId, groupId, addedBy) {
    return GroupService.addUserToGroup(userId, groupId, addedBy)
  }

  static async removeUserFromGroup(userId, groupId) {
    const result = await GroupService.removeUserFromGroup(userId, groupId)
    return result !== null
  }

  /**
   * Creates default roles and assigns permissions for a new tenant
   */
  static async initializeTenantRBAC(tenantId) {
    try {
      console.log(`Initializing RBAC for tenant ${tenantId}`)

      // Get all available permissions
      const permissions = await PermissionService.getPermissions()

      // Create Super Admin role with all permissions
      const superAdminRole = await RoleService.createRole({
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: permissions.map(p => p.id)
      }, tenantId, null, true)

      // Create Admin role with most permissions (exclude system permissions)
      const adminPermissions = permissions.filter(p => !p.name.includes('system.')).map(p => p.id)
      const adminRole = await RoleService.createRole({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with user and object management',
        permissions: adminPermissions.length > 0 ? adminPermissions : permissions.map(p => p.id)
      }, tenantId, null, true)

      // Create Manager role with object and user management permissions
      const managerPermissions = permissions.filter(p => 
        p.resource === 'objects' || p.resource === 'users'
      ).map(p => p.id)
      const managerRole = await RoleService.createRole({
        name: 'manager',
        displayName: 'Manager',
        description: 'Can manage objects and view reports',
        permissions: managerPermissions.length > 0 ? managerPermissions : permissions.slice(0, 2).map(p => p.id)
      }, tenantId, null, true)

      // Create Operator role with object permissions
      const operatorPermissions = permissions.filter(p => 
        p.resource === 'objects' && ['read', 'create', 'update'].includes(p.action)
      ).map(p => p.id)
      const operatorRole = await RoleService.createRole({
        name: 'operator',
        displayName: 'Operator',
        description: 'Can create and update objects',
        permissions: operatorPermissions.length > 0 ? operatorPermissions : permissions.filter(p => p.resource === 'objects').map(p => p.id)
      }, tenantId, null, true)

      // Create Viewer role with read permissions
      const viewerPermissions = permissions.filter(p => p.action === 'read').map(p => p.id)
      const viewerRole = await RoleService.createRole({
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access to objects and reports',
        permissions: viewerPermissions.length > 0 ? viewerPermissions : [permissions.find(p => p.name.includes('read'))?.id || permissions[0]?.id].filter(Boolean)
      }, tenantId, null, true)

      // Create User role with basic object permissions
      const userPermissions = permissions.filter(p => 
        p.name === 'objects.read' || p.name === 'objects.create'
      ).map(p => p.id)
      const userRole = await RoleService.createRole({
        name: 'user',
        displayName: 'Standard User',
        description: 'Basic user access for own objects',
        permissions: userPermissions.length > 0 ? userPermissions : [permissions.find(p => p.name.includes('objects'))?.id || permissions[0]?.id].filter(Boolean)
      }, tenantId, null, true)

      console.log(`Created default roles for tenant ${tenantId}`)

      return {
        super_admin: superAdminRole,
        admin: adminRole,
        manager: managerRole,
        operator: operatorRole,
        viewer: viewerRole,
        user: userRole
      }
    } catch (error) {
      console.error('Error initializing tenant RBAC:', error)
      throw error
    }
  }

  /**
   * Get comprehensive user access information
   */
  static async getUserAccessInfo(userId, tenantId) {
    try {
      const [permissions, roles] = await Promise.all([
        PermissionService.getUserPermissions(userId, tenantId),
        RoleService.getUserRoles(userId, tenantId)
      ])

      return {
        permissions,
        roles,
        hasAdminAccess: permissions.some(p => p.name === 'admin.full_access'),
        canManageUsers: permissions.some(p => p.name === 'users.manage'),
        canManageObjects: permissions.some(p => p.name === 'objects.manage')
      }
    } catch (error) {
      console.error('Error getting user access info:', error)
      return {
        permissions: [],
        roles: [],
        hasAdminAccess: false,
        canManageUsers: false,
        canManageObjects: false
      }
    }
  }
}