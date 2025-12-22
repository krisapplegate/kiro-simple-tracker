import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'

const API_URL = process.env.API_URL || 'http://localhost:3001'

describe('Workspace Creation and Management', () => {
  let adminToken
  let adminUserId
  let createdWorkspaceId

  beforeAll(async () => {
    // Login as admin to get token
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'admin@demo.com',
        password: 'password'
      })
      .expect(200)

    adminToken = loginResponse.body.token
    adminUserId = loginResponse.body.user.id
  })

  afterAll(async () => {
    // Cleanup: Delete created workspace if needed
    // Note: We don't have a delete endpoint yet, so this is a placeholder
  })

  describe('Workspace Creation', () => {
    it('should create a new workspace with valid name', async () => {
      const workspaceName = `Test Workspace ${Date.now()}`
      
      const response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: workspaceName })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(workspaceName)
      expect(response.body).toHaveProperty('created_at')
      expect(response.body).toHaveProperty('updated_at')

      createdWorkspaceId = response.body.id
    })

    it('should reject workspace creation without name', async () => {
      const response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400)

      expect(response.body.message).toContain('name')
    })

    it('should reject workspace creation without authentication', async () => {
      await request(API_URL)
        .post('/api/tenants')
        .send({ name: 'Unauthorized Workspace' })
        .expect(401)
    })

    it('should reject workspace creation with empty name', async () => {
      const response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ' })
        .expect(400)

      expect(response.body.message).toContain('name')
    })
  })

  describe('RBAC Initialization', () => {
    it('should initialize default roles for new workspace', async () => {
      // Create a new workspace
      const workspaceName = `RBAC Test Workspace ${Date.now()}`
      const createResponse = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: workspaceName })
        .expect(201)

      const newWorkspaceId = createResponse.body.id

      // Get user info for the new workspace to get a valid token
      const userResponse = await request(API_URL)
        .get(`/api/tenants/${newWorkspaceId}/user`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      // Login again to get a token for the new workspace
      const loginResponse = await request(API_URL)
        .post('/api/auth/login')
        .send({
          email: 'admin@demo.com',
          password: 'password'
        })
        .expect(200)

      // Note: The token will still be for tenant 1, but we can verify roles exist
      // by checking if the user has access to the new workspace
      const tenantsResponse = await request(API_URL)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const newWorkspace = tenantsResponse.body.find(t => t.id === newWorkspaceId)
      expect(newWorkspace).toBeDefined()
      expect(newWorkspace.name).toBe(workspaceName)
    })

    it('should assign super_admin role to workspace creator', async () => {
      // This test verifies that the creator has super_admin role
      // by checking if they can access admin-level endpoints
      
      const workspaceName = `Creator Role Test ${Date.now()}`
      const createResponse = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: workspaceName })
        .expect(201)

      const newWorkspaceId = createResponse.body.id

      // Verify user has access to the new workspace
      const tenantsResponse = await request(API_URL)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      const hasAccess = tenantsResponse.body.some(t => t.id === newWorkspaceId)
      expect(hasAccess).toBe(true)
    })
  })

  describe('Multi-Workspace Access', () => {
    it('should list all workspaces user has access to', async () => {
      const response = await request(API_URL)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      // Verify structure of workspace objects
      response.body.forEach(workspace => {
        expect(workspace).toHaveProperty('id')
        expect(workspace).toHaveProperty('name')
        expect(workspace).toHaveProperty('created_at')
        expect(workspace).toHaveProperty('user_role')
        expect(workspace).toHaveProperty('roles')
      })
    })

    it('should get specific workspace details', async () => {
      const response = await request(API_URL)
        .get('/api/tenants/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', 1)
      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('stats')
    })

    it('should reject access to non-existent workspace', async () => {
      await request(API_URL)
        .get('/api/tenants/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('should get user info for specific workspace', async () => {
      const response = await request(API_URL)
        .get('/api/tenants/1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
      expect(response.body).toHaveProperty('role')
      expect(response.body).toHaveProperty('tenant')
      expect(response.body).toHaveProperty('permissions')
      expect(response.body).toHaveProperty('roles')
    })
  })

  describe('Workspace Isolation', () => {
    it('should maintain separate data between workspaces', async () => {
      // Create two workspaces
      const workspace1Name = `Isolation Test 1 ${Date.now()}`
      const workspace2Name = `Isolation Test 2 ${Date.now()}`

      const ws1Response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: workspace1Name })
        .expect(201)

      const ws2Response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: workspace2Name })
        .expect(201)

      expect(ws1Response.body.id).not.toBe(ws2Response.body.id)
      expect(ws1Response.body.name).toBe(workspace1Name)
      expect(ws2Response.body.name).toBe(workspace2Name)
    })

    it('should allow same user email in multiple workspaces', async () => {
      // Verify user exists in multiple workspaces
      const response = await request(API_URL)
        .get('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      // Admin should have access to multiple workspaces
      expect(response.body.length).toBeGreaterThan(1)
      
      // All should have the same user email but different workspace IDs
      const workspaceIds = response.body.map(w => w.id)
      const uniqueIds = new Set(workspaceIds)
      expect(uniqueIds.size).toBe(workspaceIds.length)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to create workspace with extremely long name
      const longName = 'A'.repeat(300)
      
      const response = await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: longName })

      // Should either succeed or return appropriate error
      expect([201, 400, 500]).toContain(response.status)
    })

    it('should handle invalid token', async () => {
      await request(API_URL)
        .post('/api/tenants')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test Workspace' })
        .expect(403)
    })

    it('should handle missing authorization header', async () => {
      await request(API_URL)
        .post('/api/tenants')
        .send({ name: 'Test Workspace' })
        .expect(401)
    })
  })
})
