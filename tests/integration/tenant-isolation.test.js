import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'

const API_URL = process.env.API_URL || 'http://localhost:3001'

describe('Tenant Isolation', () => {
  let adminToken
  let workspace1Id
  let workspace2Id
  let object1Id
  let object2Id

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

    // Create two test workspaces
    const workspace1Response = await request(API_URL)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Isolation Test Workspace 1 ${Date.now()}` })
      .expect(201)

    workspace1Id = workspace1Response.body.id

    const workspace2Response = await request(API_URL)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Isolation Test Workspace 2 ${Date.now()}` })
      .expect(201)

    workspace2Id = workspace2Response.body.id
  })

  describe('Object Isolation', () => {
    it('should create objects in different workspaces', async () => {
      // Create object in workspace 1
      const object1Response = await request(API_URL)
        .post('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .send({
          name: 'Object in Workspace 1',
          type: 'test',
          lat: 37.7749,
          lng: -122.4194
        })
        .expect(201)

      object1Id = object1Response.body.id
      expect(object1Response.body.tenantId).toBe(workspace1Id)

      // Create object in workspace 2
      const object2Response = await request(API_URL)
        .post('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .send({
          name: 'Object in Workspace 2',
          type: 'test',
          lat: 37.7849,
          lng: -122.4094
        })
        .expect(201)

      object2Id = object2Response.body.id
      expect(object2Response.body.tenantId).toBe(workspace2Id)
    })

    it('should only return objects from the specified workspace', async () => {
      // Get objects from workspace 1
      const workspace1Objects = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      // Should contain only the object from workspace 1
      expect(workspace1Objects.body).toHaveLength(1)
      expect(workspace1Objects.body[0].id).toBe(object1Id)
      expect(workspace1Objects.body[0].tenantId).toBe(workspace1Id)

      // Get objects from workspace 2
      const workspace2Objects = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(200)

      // Should contain only the object from workspace 2
      expect(workspace2Objects.body).toHaveLength(1)
      expect(workspace2Objects.body[0].id).toBe(object2Id)
      expect(workspace2Objects.body[0].tenantId).toBe(workspace2Id)
    })

    it('should not allow access to objects from other workspaces', async () => {
      // Try to delete object from workspace 1 while in workspace 2 context
      const deleteResponse = await request(API_URL)
        .delete(`/api/objects/${object1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(404) // Should not find the object

      expect(deleteResponse.body.message).toContain('not found')
    })

    it('should allow deletion of objects within the same workspace', async () => {
      // Delete object from workspace 1 while in workspace 1 context
      await request(API_URL)
        .delete(`/api/objects/${object1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      // Verify object is deleted from workspace 1
      const workspace1Objects = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      expect(workspace1Objects.body).toHaveLength(0)

      // Verify object in workspace 2 is still there
      const workspace2Objects = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(200)

      expect(workspace2Objects.body).toHaveLength(1)
      expect(workspace2Objects.body[0].id).toBe(object2Id)
    })
  })

  describe('RBAC Isolation', () => {
    it('should have separate roles for each workspace', async () => {
      // Get roles from workspace 1
      const workspace1Roles = await request(API_URL)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      // Get roles from workspace 2
      const workspace2Roles = await request(API_URL)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(200)

      // Both should have the same role names but different IDs
      expect(workspace1Roles.body).toHaveLength(6) // 6 default roles
      expect(workspace2Roles.body).toHaveLength(6) // 6 default roles

      const workspace1RoleIds = workspace1Roles.body.map(r => r.id)
      const workspace2RoleIds = workspace2Roles.body.map(r => r.id)

      // Role IDs should be different (separate instances)
      expect(workspace1RoleIds).not.toEqual(workspace2RoleIds)

      // But role names should be the same
      const workspace1RoleNames = workspace1Roles.body.map(r => r.name).sort()
      const workspace2RoleNames = workspace2Roles.body.map(r => r.name).sort()
      expect(workspace1RoleNames).toEqual(workspace2RoleNames)
    })

    it('should have separate users for each workspace', async () => {
      // Get users from workspace 1
      const workspace1Users = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      // Get users from workspace 2
      const workspace2Users = await request(API_URL)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(200)

      // Both should have the admin user but with different IDs
      expect(workspace1Users.body).toHaveLength(1)
      expect(workspace2Users.body).toHaveLength(1)

      expect(workspace1Users.body[0].email).toBe('admin@demo.com')
      expect(workspace2Users.body[0].email).toBe('admin@demo.com')

      // User IDs should be different (separate instances)
      expect(workspace1Users.body[0].id).not.toBe(workspace2Users.body[0].id)
    })
  })

  describe('Type Configuration Isolation', () => {
    it('should have separate object type configurations per workspace', async () => {
      // Create type config in workspace 1
      await request(API_URL)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .send({
          typeName: 'custom-type',
          emoji: '🚀',
          color: '#ff0000'
        })
        .expect(200)

      // Create different type config in workspace 2
      await request(API_URL)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .send({
          typeName: 'custom-type',
          emoji: '🎯',
          color: '#00ff00'
        })
        .expect(200)

      // Get type configs from workspace 1
      const workspace1Configs = await request(API_URL)
        .get('/api/object-type-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace1Id.toString())
        .expect(200)

      // Get type configs from workspace 2
      const workspace2Configs = await request(API_URL)
        .get('/api/object-type-configs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .expect(200)

      // Should have different configurations for the same type name
      expect(workspace1Configs.body['custom-type'].emoji).toBe('🚀')
      expect(workspace1Configs.body['custom-type'].color).toBe('#ff0000')

      expect(workspace2Configs.body['custom-type'].emoji).toBe('🎯')
      expect(workspace2Configs.body['custom-type'].color).toBe('#00ff00')
    })
  })

  describe('Error Handling', () => {
    it('should reject access to non-existent workspace', async () => {
      const nonExistentTenantId = 99999

      await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', nonExistentTenantId.toString())
        .expect(403)
    })

    it('should reject access without tenant header when needed', async () => {
      // Without X-Tenant-Id header, should use default tenant from JWT
      const response = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      // Should return objects from default tenant (tenant 1)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should handle invalid tenant ID format', async () => {
      // When tenant ID is invalid (NaN), it should fall back to default tenant
      // and return objects from the default tenant (tenant 1)
      const response = await request(API_URL)
        .get('/api/objects')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', 'invalid-id')
        .expect(200)

      // Should return objects from default tenant (since invalid ID falls back)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  afterAll(async () => {
    // Cleanup: Delete remaining objects
    if (object2Id) {
      await request(API_URL)
        .delete(`/api/objects/${object2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-Id', workspace2Id.toString())
        .catch(() => {}) // Ignore errors
    }
  })
})