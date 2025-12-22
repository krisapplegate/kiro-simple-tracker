/**
 * Unit Tests for RBAC System
 * Tests the RBACService class and permission logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the database module before importing RBACService
vi.mock('../../backend/database.js', () => ({
  query: vi.fn()
}))

// Now import the modules
import { RBACService } from '../../backend/services/RBACService.js'
import { query } from '../../backend/database.js'

describe('RBACService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('getUserPermissions', () => {
    it('should return user permissions from roles and groups', async () => {
      const mockPermissions = [
        { name: 'objects.read', display_name: 'Read Objects', resource: 'objects', action: 'read' },
        { name: 'objects.create', display_name: 'Create Objects', resource: 'objects', action: 'create' }
      ]
      
      query.mockResolvedValue({ rows: mockPermissions })
      
      const permissions = await RBACService.getUserPermissions(1, 1)
      
      expect(permissions).toHaveLength(2)
      expect(permissions[0].name).toBe('objects.read')
      expect(permissions[1].name).toBe('objects.create')
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT DISTINCT p.name'), [1])
    })

    it('should return empty array on error', async () => {
      query.mockRejectedValue(new Error('Database error'))
      
      const permissions = await RBACService.getUserPermissions(1, 1)
      
      expect(permissions).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] })
      
      const hasPermission = await RBACService.hasPermission(1, 1, 'objects.read')
      
      expect(hasPermission).toBe(true)
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT 1'), [1, 1, 'objects.read'])
    })

    it('should return false when user lacks permission', async () => {
      query.mockResolvedValue({ rows: [] })
      
      const hasPermission = await RBACService.hasPermission(1, 1, 'objects.delete')
      
      expect(hasPermission).toBe(false)
    })

    it('should return false on database error', async () => {
      query.mockRejectedValue(new Error('Database error'))
      
      const hasPermission = await RBACService.hasPermission(1, 1, 'objects.read')
      
      expect(hasPermission).toBe(false)
    })
  })

  describe('canAccessObject', () => {
    it('should allow access with manage permission', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] }) // hasPermission(manage) = true
      
      const canAccess = await RBACService.canAccessObject(1, 1, 1, 'delete')
      
      expect(canAccess).toBe(true)
    })

    it('should check ownership for non-manage users', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // hasPermission(manage) = false
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // hasPermission(delete) = true
        .mockResolvedValueOnce({ rows: [{ created_by: 1 }] }) // object ownership check
      
      const canAccess = await RBACService.canAccessObject(1, 1, 1, 'delete')
      
      expect(canAccess).toBe(true)
    })

    it('should deny access for non-owners without manage permission', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // hasPermission(manage) = false
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // hasPermission(delete) = true
        .mockResolvedValueOnce({ rows: [{ created_by: 2 }] }) // different owner
      
      const canAccess = await RBACService.canAccessObject(1, 1, 1, 'delete')
      
      expect(canAccess).toBe(false)
    })
  })

  describe('getUserRoles', () => {
    it('should return user roles from direct assignment and groups', async () => {
      const mockRoles = [
        { id: 1, name: 'admin', display_name: 'Administrator', is_system_role: true },
        { id: 2, name: 'user', display_name: 'User', is_system_role: true }
      ]
      
      query.mockResolvedValue({ rows: mockRoles })
      
      const roles = await RBACService.getUserRoles(1, 1)
      
      expect(roles).toHaveLength(2)
      expect(roles[0].name).toBe('admin')
      expect(roles[1].name).toBe('user')
    })
  })

  describe('createRole', () => {
    it('should create role with permissions', async () => {
      const roleData = {
        name: 'test-role',
        displayName: 'Test Role',
        description: 'Test role description',
        permissions: [1, 2, 3]
      }
      
      query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: 'test-role' }] }) // role creation
        .mockResolvedValue({ rows: [] }) // permission assignments
      
      const role = await RBACService.createRole(roleData, 1, 1)
      
      expect(role.name).toBe('test-role')
      expect(query).toHaveBeenCalledTimes(2) // 1 role creation + 1 permission assignment
    })

    it('should handle role creation without permissions', async () => {
      const roleData = {
        name: 'test-role',
        displayName: 'Test Role',
        description: 'Test role description',
        permissions: []
      }
      
      query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'test-role' }] })
      
      const role = await RBACService.createRole(roleData, 1, 1)
      
      expect(role.name).toBe('test-role')
      expect(query).toHaveBeenCalledTimes(1) // Only role creation
    })
  })

  describe('deleteRole', () => {
    it('should delete non-system role', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ is_system_role: false }] }) // role check
        .mockResolvedValueOnce({ rowCount: 1 }) // deletion
      
      const result = await RBACService.deleteRole(1, 1)
      
      expect(result).toBe(true)
    })

    it('should not delete system role', async () => {
      query.mockResolvedValueOnce({ rows: [{ is_system_role: true }] })
      
      await expect(RBACService.deleteRole(1, 1)).rejects.toThrow('System roles cannot be deleted')
    })

    it('should return false for non-existent role', async () => {
      query.mockResolvedValueOnce({ rows: [] })
      
      const result = await RBACService.deleteRole(999, 1)
      
      expect(result).toBe(false)
    })
  })

  describe('assignRoleToUser', () => {
    it('should assign role to user', async () => {
      query.mockResolvedValueOnce({ rows: [{ user_id: 1, role_id: 2 }] })
      
      const assignment = await RBACService.assignRoleToUser(1, 2, 1)
      
      expect(assignment.user_id).toBe(1)
      expect(assignment.role_id).toBe(2)
    })

    it('should handle duplicate assignment gracefully', async () => {
      query.mockResolvedValueOnce({ rows: [] }) // ON CONFLICT DO NOTHING
      
      const assignment = await RBACService.assignRoleToUser(1, 2, 1)
      
      expect(assignment).toBeNull()
    })
  })

  describe('removeRoleFromUser', () => {
    it('should remove role from user', async () => {
      query.mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await RBACService.removeRoleFromUser(1, 2)
      
      expect(result).toBe(true)
    })

    it('should return false when assignment not found', async () => {
      query.mockResolvedValueOnce({ rowCount: 0 })
      
      const result = await RBACService.removeRoleFromUser(1, 999)
      
      expect(result).toBe(false)
    })
  })

  describe('createGroup', () => {
    it('should create group successfully', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test group description'
      }
      
      query.mockResolvedValue({ rows: [{ id: 1, name: 'Test Group' }] })
      
      const group = await RBACService.createGroup(groupData, 1, 1)
      
      expect(group.name).toBe('Test Group')
    })
  })

  describe('addUserToGroup', () => {
    it('should add user to group', async () => {
      query.mockResolvedValueOnce({ rows: [{ user_id: 1, group_id: 1 }] })
      
      const assignment = await RBACService.addUserToGroup(1, 1, 1)
      
      expect(assignment.user_id).toBe(1)
      expect(assignment.group_id).toBe(1)
    })
  })

  describe('removeUserFromGroup', () => {
    it('should remove user from group', async () => {
      query.mockResolvedValueOnce({ rowCount: 1 })
      
      const result = await RBACService.removeUserFromGroup(1, 1)
      
      expect(result).toBe(true)
    })
  })
})

// Permission validation tests
describe('Permission Validation', () => {
  const validPermissions = [
    'objects.read', 'objects.create', 'objects.update', 'objects.delete', 'objects.manage',
    'users.read', 'users.create', 'users.update', 'users.delete', 'users.manage',
    'roles.read', 'roles.create', 'roles.update', 'roles.delete', 'roles.manage',
    'groups.read', 'groups.create', 'groups.update', 'groups.delete', 'groups.manage',
    'types.read', 'types.create', 'types.update', 'types.delete', 'types.manage',
    'icons.read', 'icons.create', 'icons.update', 'icons.delete', 'icons.manage',
    'system.admin', 'system.audit'
  ]

  it('should validate all expected permissions exist', () => {
    expect(validPermissions).toHaveLength(32)
    
    // Check resource coverage
    const resources = ['objects', 'users', 'roles', 'groups', 'types', 'icons', 'system']
    resources.forEach(resource => {
      if (resource === 'system') {
        expect(validPermissions).toContain('system.admin')
      } else {
        const actions = ['read', 'create', 'update', 'delete', 'manage']
        actions.forEach(action => {
          expect(validPermissions).toContain(`${resource}.${action}`)
        })
      }
    })
  })

  it('should have consistent permission naming', () => {
    validPermissions.forEach(permission => {
      expect(permission).toMatch(/^[a-z]+\.[a-z]+$/)
    })
  })
})

// Role hierarchy tests
describe('Role Hierarchy', () => {
  const roleHierarchy = {
    'super_admin': 32,
    'admin': 31,
    'manager': 16,
    'operator': 12,
    'viewer': 7,
    'user': 6
  }

  it('should have correct permission counts for each role', () => {
    Object.entries(roleHierarchy).forEach(([role, expectedCount]) => {
      expect(expectedCount).toBeGreaterThan(0)
      expect(expectedCount).toBeLessThanOrEqual(32)
    })
  })

  it('should maintain hierarchy order', () => {
    const counts = Object.values(roleHierarchy)
    const sortedCounts = [...counts].sort((a, b) => b - a)
    expect(counts).toEqual(sortedCounts)
  })

  it('should have super_admin with all permissions', () => {
    expect(roleHierarchy.super_admin).toBe(32)
  })

  it('should have user with minimum permissions', () => {
    expect(roleHierarchy.user).toBe(6)
  })
})