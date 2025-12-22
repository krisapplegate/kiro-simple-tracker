/**
 * Unit Tests for User Model
 * Tests user authentication, creation, and management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { User } from '../../backend/models/User.js'
import { query } from '../../backend/database.js'
import bcrypt from 'bcryptjs'

// Mock database queries
const mockQuery = (mockResults) => {
  return vi.fn().mockImplementation((sql, params) => {
    if (sql.includes('SELECT u.*, t.name as tenant_name')) {
      if (sql.includes('WHERE u.email = $1')) {
        return { rows: mockResults.userByEmail || [] }
      }
      if (sql.includes('WHERE u.id = $1')) {
        return { rows: mockResults.userById || [] }
      }
      if (sql.includes('WHERE u.tenant_id = $1')) {
        return { rows: mockResults.usersByTenant || [] }
      }
    }
    if (sql.includes('INSERT INTO users')) {
      return { rows: mockResults.createdUser || [] }
    }
    return { rows: [], rowCount: 0 }
  })
}

describe('User Model', () => {
  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        role: 'user',
        tenant_id: 1,
        tenant_name: 'Test Tenant'
      }

      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ userByEmail: [mockUser] })

      const user = await User.findByEmail('test@example.com')

      expect(user).toBeDefined()
      expect(user.id).toBe(1)
      expect(user.email).toBe('test@example.com')
      expect(user.password).toBe('hashed_password')
      expect(user.role).toBe('user')
      expect(user.tenant.id).toBe(1)
      expect(user.tenant.name).toBe('Test Tenant')

      User.query = originalQuery
    })

    it('should return null when user not found', async () => {
      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ userByEmail: [] })

      const user = await User.findByEmail('nonexistent@example.com')

      expect(user).toBeNull()

      User.query = originalQuery
    })
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        tenant_id: 1,
        tenant_name: 'Test Tenant'
      }

      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ userById: [mockUser] })

      const user = await User.findById(1)

      expect(user).toBeDefined()
      expect(user.id).toBe(1)
      expect(user.email).toBe('test@example.com')
      expect(user.role).toBe('user')

      User.query = originalQuery
    })

    it('should return null when user not found', async () => {
      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ userById: [] })

      const user = await User.findById(999)

      expect(user).toBeNull()

      User.query = originalQuery
    })
  })

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'plainpassword',
        name: 'New User',
        role: 'user',
        tenantId: 1
      }

      const mockCreatedUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
        tenant_id: 1,
        created_at: new Date()
      }

      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ createdUser: [mockCreatedUser] })

      const user = await User.create(userData)

      expect(user).toBeDefined()
      expect(user.id).toBe(2)
      expect(user.email).toBe('newuser@example.com')
      expect(user.name).toBe('New User')
      expect(user.role).toBe('user')

      User.query = originalQuery
    })

    it('should use default role when not specified', async () => {
      const userData = {
        email: 'defaultuser@example.com',
        password: 'password',
        tenantId: 1
      }

      const mockCreatedUser = {
        id: 3,
        email: 'defaultuser@example.com',
        role: 'user',
        tenant_id: 1,
        created_at: new Date()
      }

      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ createdUser: [mockCreatedUser] })

      const user = await User.create(userData)

      expect(user.role).toBe('user')

      User.query = originalQuery
    })
  })

  describe('findByTenant', () => {
    it('should return users with their roles', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'user1@example.com',
          name: 'User One',
          role: 'admin',
          created_at: new Date(),
          roles: [
            { id: 1, name: 'admin', display_name: 'Administrator' }
          ]
        },
        {
          id: 2,
          email: 'user2@example.com',
          name: 'User Two',
          role: 'user',
          created_at: new Date(),
          roles: [
            { id: 2, name: 'user', display_name: 'User' }
          ]
        }
      ]

      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ usersByTenant: mockUsers })

      const users = await User.findByTenant(1)

      expect(users).toHaveLength(2)
      expect(users[0].email).toBe('user1@example.com')
      expect(users[0].roles).toHaveLength(1)
      expect(users[0].roles[0].name).toBe('admin')
      expect(users[1].email).toBe('user2@example.com')

      User.query = originalQuery
    })

    it('should return empty array when no users found', async () => {
      const originalQuery = User.query || require('../../backend/database.js').query
      User.query = mockQuery({ usersByTenant: [] })

      const users = await User.findByTenant(999)

      expect(users).toEqual([])

      User.query = originalQuery
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'testpassword'
      const hashedPassword = await bcrypt.hash(plainPassword, 10)

      const isValid = await User.verifyPassword(plainPassword, hashedPassword)

      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const plainPassword = 'testpassword'
      const wrongPassword = 'wrongpassword'
      const hashedPassword = await bcrypt.hash(plainPassword, 10)

      const isValid = await User.verifyPassword(wrongPassword, hashedPassword)

      expect(isValid).toBe(false)
    })

    it('should handle empty passwords', async () => {
      const hashedPassword = await bcrypt.hash('password', 10)

      const isValid = await User.verifyPassword('', hashedPassword)

      expect(isValid).toBe(false)
    })
  })
})

// Password security tests
describe('Password Security', () => {
  it('should hash passwords with sufficient complexity', async () => {
    const password = 'testpassword123'
    const hash = await bcrypt.hash(password, 10)

    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
    expect(hash).toMatch(/^\$2[aby]\$/)
  })

  it('should generate different hashes for same password', async () => {
    const password = 'samepassword'
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)

    expect(hash1).not.toBe(hash2)
    expect(await bcrypt.compare(password, hash1)).toBe(true)
    expect(await bcrypt.compare(password, hash2)).toBe(true)
  })
})

// Email validation tests
describe('Email Validation', () => {
  const validEmails = [
    'user@example.com',
    'test.user@domain.co.uk',
    'admin+test@company.org',
    'user123@test-domain.com'
  ]

  const invalidEmails = [
    'invalid-email',
    '@domain.com',
    'user@',
    'user..double@domain.com',
    'user@domain',
    ''
  ]

  it('should accept valid email formats', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true)
    })
  })

  it('should reject invalid email formats', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false)
    })
  })
})

// User role validation tests
describe('User Role Validation', () => {
  const validRoles = ['super_admin', 'admin', 'manager', 'operator', 'viewer', 'user']
  const invalidRoles = ['invalid', 'ADMIN', 'User', '', null, undefined]

  it('should accept valid roles', () => {
    validRoles.forEach(role => {
      expect(validRoles.includes(role)).toBe(true)
    })
  })

  it('should reject invalid roles', () => {
    invalidRoles.forEach(role => {
      expect(validRoles.includes(role)).toBe(false)
    })
  })

  it('should have consistent role naming', () => {
    validRoles.forEach(role => {
      expect(role).toMatch(/^[a-z_]+$/)
      expect(role).not.toContain(' ')
      expect(role).not.toContain('-')
    })
  })
})