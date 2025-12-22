/**
 * Unit Tests for User Model
 * Tests user authentication, creation, and management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the database module before importing User
vi.mock('../../backend/database.js', () => ({
  query: vi.fn()
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  }
}))

// Now import the modules
import { User } from '../../backend/models/User.js'
import { query } from '../../backend/database.js'
import bcrypt from 'bcryptjs'

describe('User Model', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'user',
        tenant_id: 1,
        tenant_name: 'Test Tenant'
      }

      query.mockResolvedValue({ rows: [mockUser] })

      const user = await User.findByEmail('test@example.com')

      expect(user).toBeDefined()
      expect(user.id).toBe(1)
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.role).toBe('user')
      expect(user.tenant).toEqual({ id: 1, name: 'Test Tenant' })
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT u.*'), ['test@example.com'])
    })

    it('should return null when user not found', async () => {
      query.mockResolvedValue({ rows: [] })

      const user = await User.findByEmail('nonexistent@example.com')

      expect(user).toBeNull()
    })
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        role: 'user',
        tenant_id: 1,
        tenant_name: 'Test Tenant'
      }

      query.mockResolvedValue({ rows: [mockUser] })

      const user = await User.findById(1)

      expect(user).toBeDefined()
      expect(user.id).toBe(1)
      expect(user.email).toBe('test@example.com')
      expect(user.role).toBe('user')
    })

    it('should return null when user not found', async () => {
      query.mockResolvedValue({ rows: [] })

      const user = await User.findById(999)

      expect(user).toBeNull()
    })
  })

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
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

      bcrypt.hash.mockResolvedValue('hashed_password123')
      query.mockResolvedValue({ rows: [mockCreatedUser] })

      const user = await User.create(userData)

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
      expect(user).toBeDefined()
      expect(user.id).toBe(2)
      expect(user.email).toBe('newuser@example.com')
      expect(user.name).toBe('New User')
      expect(user.role).toBe('user')
    })

    it('should create user with default role when not specified', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        tenantId: 1
      }

      const mockCreatedUser = {
        id: 2,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
        tenant_id: 1
      }

      bcrypt.hash.mockResolvedValue('hashed_password123')
      query.mockResolvedValue({ rows: [mockCreatedUser] })

      const user = await User.create(userData)

      expect(user.role).toBe('user')
    })
  })

  describe('findByTenant', () => {
    it('should return users for tenant', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'user1@example.com',
          name: 'User 1',
          role: 'admin',
          tenant_id: 1
        },
        {
          id: 2,
          email: 'user2@example.com',
          name: 'User 2',
          role: 'user',
          tenant_id: 1
        }
      ]

      query.mockResolvedValue({ rows: mockUsers })

      const users = await User.findByTenant(1)

      expect(users).toHaveLength(2)
      expect(users[0].email).toBe('user1@example.com')
      expect(users[0].role).toBe('admin')
      expect(users[1].email).toBe('user2@example.com')
    })

    it('should return empty array when no users found', async () => {
      query.mockResolvedValue({ rows: [] })

      const users = await User.findByTenant(999)

      expect(users).toEqual([])
    })
  })

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      const user = {
        password_hash: 'hashed_password'
      }

      bcrypt.compare.mockResolvedValue(true)

      const isValid = await User.validatePassword(user, 'correct_password')

      expect(isValid).toBe(true)
      expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password')
    })

    it('should return false for incorrect password', async () => {
      const user = {
        password_hash: 'hashed_password'
      }

      bcrypt.compare.mockResolvedValue(false)

      const isValid = await User.validatePassword(user, 'wrong_password')

      expect(isValid).toBe(false)
    })
  })

  describe('updateLastLogin', () => {
    it('should update user last login timestamp', async () => {
      query.mockResolvedValue({ rows: [{ id: 1, last_login: new Date() }] })

      const result = await User.updateLastLogin(1)

      expect(result).toBeDefined()
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login'),
        [1]
      )
    })
  })
})