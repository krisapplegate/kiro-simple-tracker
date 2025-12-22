import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RBACService } from '../../backend/services/RBACService.js'

// Mock the database query function
vi.mock('../../backend/database.js', () => ({
  query: vi.fn()
}))

import { query } from '../../backend/database.js'

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

      // Mock role creation queries
      query
        .mockResolvedValueOnce({ rows: [mockRoleResults[0]] }) // super_admin
        .mockResolvedValueOnce({ rows: [mockRoleResults[1]] }) // admin
        .mockResolvedValueOnce({ rows: [mockRoleResults[2]] }) // manager
        .mockResolvedValueOnce({ rows: [mockRoleResults[3]] }) // operator
        .mockResolvedValueOnce({ rows: [mockRoleResults[4]] }) // viewer
        .mockResolvedValueOnce({ rows: [mockRoleResults[5]] }) // user
        .mockResolvedValueOnce({ rows: mockPermissions }) // get permissions
        .mockResolvedValue({ rows: [] }) // permission assignments

      const result = await RBACService.initializeTenantRBAC(tenantId)

      // Verify all 6 roles were created
      expect(query).toHaveBeenCalledTimes(13) // 6 role creations + 1 permissions query + 6 permission assignments
      
      // Verify role creation calls
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), tenantId, true])
      )

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

      query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'super_admin' }] }) // super_admin creation
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'admin' }] }) // admin creation
        .mockResolvedValueOnce({ rows: [{ id: 3, name: 'manager' }] }) // manager creation
        .mockResolvedValueOnce({ rows: [{ id: 4, name: 'operator' }] }) // operator creation
        .mockResolvedValueOnce({ rows: [{ id: 5, name: 'viewer' }] }) // viewer creation
        .mockResolvedValueOnce({ rows: [{ id: 6, name: 'user' }] }) // user creation
        .mockResolvedValueOnce({ rows: mockPermissions }) // get permissions
        .mockResolvedValue({ rows: [] }) // permission assignments

      await RBACService.initializeTenantRBAC(tenantId)

      // Verify super_admin gets all permissions
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO role_permissions'),
        expect.arrayContaining([1, ...mockPermissions.map(p => p.id)])
      )
    })

    it('should handle database errors gracefully', async () => {
      const tenantId = 123
      const dbError = new Error('Database connection failed')
      
      query.mockRejectedValue(dbError)

      await expect(RBACService.initializeTenantRBAC(tenantId))
        .rejects.toThrow('Database connection failed')
    })

    it('should create roles with correct properties', async () => {
      const tenantId = 456
      
      query
        .mockResolvedValue({ rows: [{ id: 1, name: 'super_admin' }] })

      await RBACService.initializeTenantRBAC(tenantId)

      // Verify super_admin role creation with correct parameters
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        ['super_admin', 'Super Administrator', 'Full system access with all permissions', tenantId, true]
      )

      // Verify admin role creation
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        ['admin', 'Administrator', 'Administrative access with user and object management', tenantId, true]
      )

      // Verify user role creation
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        ['user', 'Standard User', 'Basic user access for own objects', tenantId, true]
      )
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

      query.mockResolvedValue({ rows: mockPermissions })

      const result = await RBACService.getUserPermissions(userId, tenantId)

      expect(result).toEqual(mockPermissions)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT p.name'),
        [userId]
      )
    })

    it('should return empty array on database error', async () => {
      const userId = 1
      const tenantId = 1
      
      query.mockRejectedValue(new Error('Database error'))

      const result = await RBACService.getUserPermissions(userId, tenantId)

      expect(result).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.read'

      query.mockResolvedValue({ rows: [{ id: 1 }] })

      const result = await RBACService.hasPermission(userId, tenantId, permissionName)

      expect(result).toBe(true)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1'),
        [userId, tenantId, permissionName]
      )
    })

    it('should return false when user does not have permission', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.delete'

      query.mockResolvedValue({ rows: [] })

      const result = await RBACService.hasPermission(userId, tenantId, permissionName)

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      const userId = 1
      const tenantId = 1
      const permissionName = 'objects.read'

      query.mockRejectedValue(new Error('Database error'))

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

      query.mockResolvedValue({ rows: [mockResult] })

      const result = await RBACService.assignRoleToUser(userId, roleId, assignedBy)

      expect(result).toEqual(mockResult)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_roles'),
        [userId, roleId, assignedBy]
      )
    })

    it('should handle conflict (role already assigned)', async () => {
      const userId = 1
      const roleId = 2
      const assignedBy = 3

      query.mockResolvedValue({ rows: [] })

      const result = await RBACService.assignRoleToUser(userId, roleId, assignedBy)

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      const userId = 1
      const roleId = 2
      const assignedBy = 3
      const dbError = new Error('Database error')

      query.mockRejectedValue(dbError)

      await expect(RBACService.assignRoleToUser(userId, roleId, assignedBy))
        .rejects.toThrow('Database error')
    })
  })
})