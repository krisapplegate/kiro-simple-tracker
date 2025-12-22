/**
 * Integration Tests for RBAC API
 * Tests the complete RBAC backend functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { query } from '../../backend/database.js'

// Test configuration
const API_URL = 'http://localhost:3001'

// Test users and tokens
let adminToken = ''
let managerToken = ''
let operatorToken = ''
let viewerToken = ''
let userToken = ''

// Test data
const testUsers = {
  admin: { email: 'admin@demo.com', password: 'password' },
  manager: { email: 'manager@test.com', password: 'password123' },
  operator: { email: 'operator@test.com', password: 'password123' },
  viewer: { email: 'viewer@test.com', password: 'password123' },
  user: { email: 'user@test.com', password: 'password123' }
}

let testRoleIds = {}
let testGroupId = null
let testUserId = null

// Helper functions
async function loginUser(email, password) {
  const response = await request(API_URL)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
  
  return response.body.token
}

async function createTestUser(userData, token) {
  const response = await request(API_URL)
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send(userData)
  
  return response.body
}

async function getRoles(token) {
  const response = await request(API_URL)
    .get('/api/rbac/roles')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
  
  return response.body
}

describe('RBAC API Integration Tests', () => {
  beforeAll(async () => {
    // Login as admin to get token
    adminToken = await loginUser(testUsers.admin.email, testUsers.admin.password)
    
    // Get role IDs for testing
    const roles = await getRoles(adminToken)
    roles.forEach(role => {
      testRoleIds[role.name] = role.id
    })
    
    // Create test users if they don't exist
    try {
      const managerUser = await createTestUser({
        email: testUsers.manager.email,
        password: testUsers.manager.password,
        roleId: testRoleIds.manager
      }, adminToken)
      
      const operatorUser = await createTestUser({
        email: testUsers.operator.email,
        password: testUsers.operator.password,
        roleId: testRoleIds.operator
      }, adminToken)
      
      const viewerUser = await createTestUser({
        email: testUsers.viewer.email,
        password: testUsers.viewer.password,
        roleId: testRoleIds.viewer
      }, adminToken)
      
      const regularUser = await createTestUser({
        email: testUsers.user.email,
        password: testUsers.user.password,
        roleId: testRoleIds.user
      }, adminToken)
      
      testUserId = regularUser.id
    } catch (error) {
      // Users might already exist, try to login
    }
    
    // Login with test users
    try {
      managerToken = await loginUser(testUsers.manager.email, testUsers.manager.password)
      operatorToken = await loginUser(testUsers.operator.email, testUsers.operator.password)
      viewerToken = await loginUser(testUsers.viewer.email, testUsers.viewer.password)
      userToken = await loginUser(testUsers.user.email, testUsers.user.password)
    } catch (error) {
      console.warn('Some test users may not exist:', error.message)
    }
  })

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: testUsers.admin.password
        })
        .expect(200)
      
      expect(response.body.token).toBeDefined()
      expect(response.body.user.email).toBe(testUsers.admin.email)
    })

    it('should reject invalid credentials', async () => {
      await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: testUsers.admin.email,
          password: 'wrongpassword'
        })
        .expect(401)
    })

    it('should validate token and return user permissions', async () => {
      const response = await request(API_URL)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(response.body.email).toBe(testUsers.admin.email)
      expect(response.body.permissions).toBeDefined()
      expect(response.body.roles).toBeDefined()
      expect(response.body.permissions.length).toBeGreaterThan(0)
    })

    it('should reject invalid token', async () => {
      await request(API_URL)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403)
    })

    it('should reject missing token', async () => {
      await request(API_URL)
        .get('/api/auth/validate')
        .expect(401)
    })
  })

  describe('Role Management', () => {
    it('should list all roles for admin', async () => {
      const response = await request(API_URL)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThanOrEqual(6) // 6 default roles
      
      // Check for default roles
      const roleNames = response.body.map(role => role.name)
      expect(roleNames).toContain('super_admin')
      expect(roleNames).toContain('admin')
      expect(roleNames).toContain('manager')
      expect(roleNames).toContain('operator')
      expect(roleNames).toContain('viewer')
      expect(roleNames).toContain('user')
    })

    it('should create custom role with permissions', async () => {
      const roleData = {
        name: 'test-custom-role',
        displayName: 'Test Custom Role',
        description: 'Custom role for testing',
        permissions: [1, 2, 3] // First 3 permissions
      }
      
      const response = await request(API_URL)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData)
        .expect(201)
      
      expect(response.body.name).toBe(roleData.name)
      expect(response.body.display_name).toBe(roleData.displayName)
      expect(response.body.description).toBe(roleData.description)
    })

    it('should prevent non-admin from creating roles', async () => {
      if (operatorToken) {
        const roleData = {
          name: 'unauthorized-role',
          displayName: 'Unauthorized Role',
          description: 'Should not be created'
        }
        
        await request(API_URL)
          .post('/api/rbac/roles')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send(roleData)
          .expect(403)
      }
    })

    it('should delete custom role', async () => {
      // First create a role to delete
      const roleData = {
        name: 'role-to-delete',
        displayName: 'Role To Delete',
        description: 'This role will be deleted'
      }
      
      const createResponse = await request(API_URL)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roleData)
        .expect(201)
      
      const roleId = createResponse.body.id
      
      // Delete the role
      await request(API_URL)
        .delete(`/api/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('should prevent deletion of system roles', async () => {
      const systemRoleId = testRoleIds.admin
      
      await request(API_URL)
        .delete(`/api/rbac/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500) // Should throw error about system roles
    })
  })

  describe('Permission Management', () => {
    it('should list all permissions', async () => {
      const response = await request(API_URL)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(32) // Expected 32 permissions
      
      // Check for key permissions
      const permissionNames = response.body.map(p => p.name)
      expect(permissionNames).toContain('objects.read')
      expect(permissionNames).toContain('objects.create')
      expect(permissionNames).toContain('users.manage')
      expect(permissionNames).toContain('roles.create')
      expect(permissionNames).toContain('system.admin')
    })

    it('should prevent non-admin from viewing permissions', async () => {
      if (userToken) {
        await request(API_URL)
          .get('/api/rbac/permissions')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403)
      }
    })
  })

  describe('User Management', () => {
    it('should list users for admin', async () => {
      const response = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Check user structure
      const user = response.body[0]
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.roles).toBeDefined()
      expect(user.created_at).toBeDefined()
    })

    it('should create new user', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'testpassword123',
        roleId: testRoleIds.user
      }
      
      const response = await request(API_URL)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201)
      
      expect(response.body.email).toBe(userData.email)
      expect(response.body.id).toBeDefined()
    })

    it('should prevent duplicate user creation', async () => {
      const userData = {
        email: testUsers.admin.email, // Existing email
        password: 'testpassword123'
      }
      
      await request(API_URL)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(409) // Conflict
    })

    it('should prevent non-admin from creating users', async () => {
      if (operatorToken) {
        const userData = {
          email: 'unauthorized@test.com',
          password: 'password123'
        }
        
        await request(API_URL)
          .post('/api/users')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send(userData)
          .expect(403)
      }
    })
  })

  describe('Role Assignment', () => {
    it('should assign role to user', async () => {
      if (testUserId && testRoleIds.operator) {
        const response = await request(API_URL)
          .post(`/api/rbac/users/${testUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roleId: testRoleIds.operator })
          .expect(200)
        
        expect(response.body).toBeDefined()
      }
    })

    it('should remove role from user', async () => {
      if (testUserId && testRoleIds.operator) {
        await request(API_URL)
          .delete(`/api/rbac/users/${testUserId}/roles/${testRoleIds.operator}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      }
    })

    it('should get user RBAC information', async () => {
      if (testUserId) {
        const response = await request(API_URL)
          .get(`/api/rbac/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
        
        expect(response.body.permissions).toBeDefined()
        expect(response.body.roles).toBeDefined()
      }
    })

    it('should prevent non-admin from managing user roles', async () => {
      if (operatorToken && testUserId && testRoleIds.user) {
        await request(API_URL)
          .post(`/api/rbac/users/${testUserId}/roles`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ roleId: testRoleIds.user })
          .expect(403)
      }
    })
  })

  describe('Group Management', () => {
    it('should create group', async () => {
      const groupData = {
        name: 'test-group',
        description: 'Test Group for testing'
      }
      
      const response = await request(API_URL)
        .post('/api/rbac/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(groupData)
        .expect(201)
      
      expect(response.body.name).toBe(groupData.name)
      expect(response.body.description).toBe(groupData.description)
      testGroupId = response.body.id
    })

    it('should list groups', async () => {
      const response = await request(API_URL)
        .get('/api/rbac/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should add user to group', async () => {
      if (testGroupId && testUserId) {
        const response = await request(API_URL)
          .post(`/api/rbac/groups/${testGroupId}/users`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: testUserId })
          .expect(200)
        
        expect(response.body).toBeDefined()
      }
    })

    it('should remove user from group', async () => {
      if (testGroupId && testUserId) {
        await request(API_URL)
          .delete(`/api/rbac/groups/${testGroupId}/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      }
    })

    it('should prevent non-admin from managing groups', async () => {
      if (operatorToken) {
        const groupData = {
          name: 'unauthorized-group',
          displayName: 'Unauthorized Group'
        }
        
        await request(API_URL)
          .post('/api/rbac/groups')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send(groupData)
          .expect(403)
      }
    })
  })

  describe('Permission-Based Access Control', () => {
    it('should allow admin to access all endpoints', async () => {
      // Test multiple admin endpoints
      await request(API_URL)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      await request(API_URL)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      await request(API_URL)
        .get('/api/rbac/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('should restrict viewer to read-only access', async () => {
      if (viewerToken) {
        // Should be able to read
        await request(API_URL)
          .get('/api/objects')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200)
        
        // Should not be able to create
        await request(API_URL)
          .post('/api/objects')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({
            name: 'Test Object',
            type: 'vehicle',
            lat: 37.7749,
            lng: -122.4194
          })
          .expect(403)
      }
    })

    it('should allow operator to manage objects but not users', async () => {
      if (operatorToken) {
        // Should be able to create objects
        const response = await request(API_URL)
          .post('/api/objects')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({
            name: 'Operator Test Object',
            type: 'device',
            lat: 37.7749,
            lng: -122.4194,
            description: 'Test object for operator'
          })
          .expect(201)
        
        const objectId = response.body.id
        
        // Should be able to delete own objects
        await request(API_URL)
          .delete(`/api/objects/${objectId}`)
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(200)
        
        // Should not be able to manage users
        await request(API_URL)
          .get('/api/users')
          .set('Authorization', `Bearer ${operatorToken}`)
          .expect(403)
      }
    })

    it('should allow manager to manage users but not roles', async () => {
      if (managerToken) {
        // Should be able to view users
        await request(API_URL)
          .get('/api/users')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(200)
        
        // Should not be able to create roles
        await request(API_URL)
          .post('/api/rbac/roles')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            name: 'unauthorized-role',
            displayName: 'Unauthorized Role'
          })
          .expect(403)
      }
    })
  })

  describe('Object Ownership', () => {
    let userObjectId = null
    let adminObjectId = null

    it('should create objects with proper ownership', async () => {
      if (userToken) {
        // Create object as regular user
        const userResponse = await request(API_URL)
          .post('/api/objects')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            name: 'User Object',
            type: 'personal',
            lat: 37.7749,
            lng: -122.4194
          })
          .expect(201)
        
        userObjectId = userResponse.body.id
      }
      
      // Create object as admin
      const adminResponse = await request(API_URL)
        .post('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Object',
          type: 'system',
          lat: 37.7749,
          lng: -122.4194
        })
        .expect(201)
      
      adminObjectId = adminResponse.body.id
    })

    it('should allow users to delete own objects', async () => {
      if (userToken && userObjectId) {
        await request(API_URL)
          .delete(`/api/objects/${userObjectId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200)
      }
    })

    it('should prevent users from deleting others objects', async () => {
      if (userToken && adminObjectId) {
        await request(API_URL)
          .delete(`/api/objects/${adminObjectId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403)
      }
    })

    it('should allow admin to delete any object', async () => {
      if (adminObjectId) {
        await request(API_URL)
          .delete(`/api/objects/${adminObjectId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid role ID in assignment', async () => {
      if (testUserId) {
        await request(API_URL)
          .post(`/api/rbac/users/${testUserId}/roles`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ roleId: 99999 }) // Non-existent role
          .expect(500)
      }
    })

    it('should handle invalid user ID in role assignment', async () => {
      await request(API_URL)
        .post('/api/rbac/users/99999/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleId: testRoleIds.user })
        .expect(500)
    })

    it('should validate required fields in user creation', async () => {
      await request(API_URL)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing email and password - should fail validation
        })
        .expect(400)
    })

    it('should validate required fields in role creation', async () => {
      await request(API_URL)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing name and displayName
          description: 'Incomplete Role'
        })
        .expect(500)
    })
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(API_URL)
        .get('/api/health')
        .expect(200)
      
      expect(response.body.status).toBe('OK')
      expect(response.body.database).toBe('connected')
      expect(response.body.timestamp).toBeDefined()
    })
  })
})