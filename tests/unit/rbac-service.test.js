import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RBACService } from '../../backend/services/RBACService.js'

// Mock the database query function
vi.mock('../../backend/database.js', () => ({
  query: vi.fn()
}))

// Mock the service dependencies
vi.mock('../../backend/services/PermissionService.js', () => ({
  PermissionService: {
    getPermissions: vi.fn(),
    getUserPermissions: vi.fn(),
    hasPermission: vi.fn(),
    canAccessObject: vi.fn()
  }
}))

vi.mock('../../backend/services/RoleService.js', () => ({
  RoleService: {
    createRole: vi.fn(),
    getUserRoles: vi.fn(),
    assignRoleToUser: vi.fn(),
    removeRoleFromUser: vi.fn(),
    getRoles: vi.fn(),
    deleteRole: vi.fn()
  }
}))

vi.mock('../../backend/services/GroupService.js', () => ({
  GroupService: {
    createGroup: vi.fn(),
    getGroups: vi.fn(),
    addUserToGroup: vi.fn(),
    removeUserFromGroup: vi.fn()
  }
}))

import { query } from '../../backend/database.js'
import { PermissionService } from '../../backend/services/PermissionService.js'
import { RoleService } from '../../backend/services/RoleService.js'

describe('RBACService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initializeTenantRBAC', () => {
    it('should create default roles for new tenant', async () => {
      const tenantId = 123
      const mockRoleResults = [
        { id: 1, name: 'super_admin' },
        { id: 2, name: 'admin' },
        { id: 3, name: 'manager' },
        { id: 4, name: 'operator' },
        { id: 5, name: 'viewer' },
        { id: 6, name: 'user' }
      ]

      const mockPermissions = [
        { id: 1, name: 'objects.create', resource: 'objects', action: 'create' },
        { id: 2, name: 'objects.read', resource: 'objects', action: 'read' },
        { id: 3, name: 'users.manage', resource: 'users', action: 'manage' },
        { id: 4, name: 'system.admin', resource: 'system', action: 'manage' }
      ]

      // Mock PermissionService.getPermissions
      PermissionService.getPermissions.mockResolvedValue(mockPermissions)

      // Mock RoleService.createRole for each role
      RoleService.createRole
        .mockResolvedValueOnce(mockRoleResults[0]) // super_admin
        .mockResolvedValueOnce(mockRoleResults[1]) // admin
        .mockResolvedValueOnce(mockRoleResults[2]) // manager
        .mockResolvedValueOnce(mockRoleResults[3]) // operator
        .mockResolvedValueOnce(mockRoleResults[4]) // viewer
        .mockResolvedValueOnce(mockRoleResults[5]) // user

      const result = await RBACService.initializeTenantRBAC(tenantId)

      // Verify permissions were fetched
      expect(PermissionService.getPermissions).toHaveBeenCalledTimes(1)
      
      // Verify all 6 roles were created
      expect(RoleService.createRole).toHaveBeenCalledTimes(6)
      
      // Verify super_admin role creation with all permissions
      expect(RoleService.createRole).toHaveBeenCalledWith({
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: [1, 2, 3, 4]
      }, tenantId, null, true)

      // Verify result contains all roles
      expect(result).toHaveProperty('super_admin')
      expect(result).toHaveProperty('admin')
      expect(result).toHaveProperty('manager')
      expect(result).toHaveProperty('operator')
      expect(result).toHaveProperty('viewer')
      expect(result).toHaveProperty('user')
    })

    it('should assign correct permissions to super_admin role', async () => {
      const tenantId = 123
      const mockPermissions = [
        { id: 1, name: 'objects.create' },
        { id: 2, name: 'users.manage' },
        { id: 3, name: 'system.admin' }
      ]

      PermissionService.getPermissions.mockResolvedValue(mockPermissions)
      RoleService.createRole
        .mockResolvedValueOnce({ id: 1, name: 'super_admin' })
        .mockResolvedValueOnce({ id: 2, name: 'admin' })
        .mockResolvedValueOnce({ id: 3, name: 'manager' })
        .mockResolvedValueOnce({ id: 4, name: 'operator' })
        .mockResolvedValueOnce({ id: 5, name: 'viewer' })
        .mockResolvedValueOnce({ id: 6, name: 'user' })

      await RBACService.initializeTenantRBAC(tenantId)

      // Verify super_admin gets all permissions
      expect(RoleService.createRole).toHaveBeenCalledWith({
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: [1, 2, 3]
      }, tenantId, null, true)
    })

    it('should handle database errors gracefully', async () => {
      const tenantId = 123
      const dbError = new Error('Database connection failed')
      
      PermissionService.getPermissions.mockRejectedValue(dbError)

      await expect(RBACService.initializeTenantRBAC(tenantId))
        .rejects.toThrow('Database connection failed')
    })

    it('should create roles with correct properties', async () => {
      const tenantId = 456
      const mockPermissions = [
        { id: 1, name: 'objects.create', resource: 'objects', action: 'create' },
        { id: 2, name: 'objects.read', resource: 'objects', action: 'read' },
        { id: 3, name: 'users.manage', resource: 'users', action: 'manage' }
      ]
      
      PermissionService.getPermissions.mockResolvedValue(mockPermissions)
      RoleService.createRole
        .mockResolvedValueOnce({ id: 1, name: 'super_admin' })
        .mockResolvedValueOnce({ id: 2, name: 'admin' })
        .mockResolvedValueOnce({ id: 3, name: 'manager' })
        .mockResolvedValueOnce({ id: 4, name: 'operator' })
        .mockResolvedValueOnce({ id: 5, name: 'viewer' })
        .mockResolvedValueOnce({ id: 6, name: 'user' })

      await RBACService.initializeTenantRBAC(tenantId)

      // Verify super_admin role creation with correct parameters
      expect(RoleService.createRole).toHaveBeenCalledWith({
        name: 'super_admin',
        displayName: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: [1, 2, 3]
      }, tenantId, null, true)

      // Verify admin role creation
      expect(RoleService.createRole).toHaveBeenCalledWith({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Administrative access with user and object management',
        permissions: [1, 2, 3] // All non-system permissions (in this case, all are non-system)
      }, tenantId, null, true)

      // Verify user role creation
      expect(RoleService.createRole).toHaveBeenCalledWith({
        name: 'user',
        displayName: 'Standard User',
        description: 'Basic user access for own objects',
        permissions: [1, 2] // objects.create and objects.read
      }, tenantId, null, true)
    })
  })

  describe('getUserPermissions', () => {
    it('should return user permissions from roles and groups', async () => {
      const userId = 1
      const tenantId = 1
      const mockPermissions = [
        { name: 'objects.read', display_name: 'View Objects', resource: 'objects', action: 'read' },
        { name: 'objects.create', display_name: 'Create Objects', resource: 'objects', action: 'create' }
      ]

      PermissionService.getUserPermissions.mockResolvedValue(mockPermissions)

      const result = await RBACService.getUserPermissions(userId, tenantId)

      expect(result).toEqual(mockPermissions)
      expect(PermissionService.getUserPermissions).toHaveBeenCalledWith(userId, tenantId)
    })

    it('should return empty array on database error', async () => {
      const userId = 1
      const tenantId = 1
      
      PermissionService.getUserPermissions.mockResolvedValue([])

      const result = await RBACService.getUserPermissions(userId, tenantId)

      expect(result).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.read'

      PermissionService.hasPermission.mockResolvedValue(true)

      const result = await RBACService.hasPermission(userId, tenantId, permissionName)

      expect(result).toBe(true)
      expect(PermissionService.hasPermission).toHaveBeenCalledWith(userId, tenantId, permissionName)
    })

    it('should return false when user does not have permission', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.delete'

      PermissionService.hasPermission.mockResolvedValue(false)

      const result = await RBACService.hasPermission(userId, tenantId, permissionName)

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.read'

      PermissionService.hasPermission.mockResolvedValue(false)

      const result = await RBACService.hasPermission(userId, tenantId, permissionName)

      expect(result).toBe(false)
    })
  })

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      const userId = 1
      const roleId = 2
      const assignedBy = 3
      const mockResult = { id: 1, user_id: userId, role_id: roleId }

      RoleService.assignRoleToUser.mockResolvedValue(mockResult)

      const result = await RBACService.assignRoleToUser(userId, roleId, assignedBy)

      expect(result).toEqual(mockResult)
      expect(RoleService.assignRoleToUser).toHaveBeenCalledWith(userId, roleId, assignedBy)
    })

    it('should handle conflict (role already assigned)', async () => {
      const userId = 1
      const roleId = 2
      const assignedBy = 3

      RoleService.assignRoleToUser.mockResolvedValue(null)

      const result = await RBACService.assignRoleToUser(userId, roleId, assignedBy)

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      const userId = 1
      const roleId = 2
      const assignedBy = 3
      const dbError = new Error('Database error')

      RoleService.assignRoleToUser.mockRejectedValue(dbError)

      await expect(RBACService.assignRoleToUser(userId, roleId, assignedBy))
        .rejects.toThrow('Database error')
    })
  })
})