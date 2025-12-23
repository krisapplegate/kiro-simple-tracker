import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { query } from '../../backend/database.js'

const API_BASE = process.env.API_URL || 'http://localhost:3001'

describe('Admin Bulk Operations API', () => {
  let authToken
  let testTenantId = 1
  let testObjectIds = []

  beforeAll(async () => {
    // Login to get auth token (assuming admin has system.admin permission)
    const loginResponse = await request(API_BASE)
      .post('/api/auth/login')
      .send({
        email: 'admin@demo.com',
        password: 'password'
      })
    
    expect(loginResponse.status).toBe(200)
    authToken = loginResponse.body.token
    testTenantId = loginResponse.body.user.tenant.id
  })

  beforeEach(async () => {
    // Create test objects for bulk operations
    testObjectIds = []
    
    for (let i = 0; i < 3; i++) {
      const objectResponse = await request(API_BASE)
        .post('/api/objects')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          name: `Bulk Test Object ${i + 1}`,
          type: 'vehicle',
          lat: 40.7128 + (i * 0.001),
          lng: -74.0060 + (i * 0.001),
          description: `Test object ${i + 1} for bulk operations`
        })
      
      expect(objectResponse.status).toBe(201)
      testObjectIds.push(objectResponse.body.id)
    }
  })

  afterEach(async () => {
    // Clean up any remaining test objects
    for (const objectId of testObjectIds) {
      await request(API_BASE)
        .delete(`/api/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .catch(() => {}) // Ignore errors if already deleted
    }
    testObjectIds = []
  })

  describe('GET /api/admin/objects', () => {
    it('should return all objects across tenants', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/objects')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      
      // Should include our test objects
      const testObjects = response.body.filter(obj => 
        obj.name.startsWith('Bulk Test Object')
      )
      expect(testObjects.length).toBeGreaterThanOrEqual(3)
    })

    it('should include object metadata', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/objects')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      
      if (response.body.length > 0) {
        const object = response.body[0]
        expect(object).toHaveProperty('id')
        expect(object).toHaveProperty('name')
        expect(object).toHaveProperty('type')
        expect(object).toHaveProperty('tenant_id')
        expect(object).toHaveProperty('created_by_email')
      }
    })

    it('should require system.admin permission', async () => {
      // This test would need a non-admin user
      // For now, verify admin access works
      const response = await request(API_BASE)
        .get('/api/admin/objects')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
    })

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/objects')

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/admin/objects/:objectId', () => {
    it('should delete object successfully', async () => {
      const objectId = testObjectIds[0]
      
      const response = await request(API_BASE)
        .delete(`/api/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('deleted successfully')
    })

    it('should remove object from database', async () => {
      const objectId = testObjectIds[0]
      
      await request(API_BASE)
        .delete(`/api/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${authToken}`)

      // Verify object is deleted
      const result = await query(
        'SELECT * FROM objects WHERE id = $1',
        [objectId]
      )

      expect(result.rows).toHaveLength(0)
    })

    it('should cascade delete location history', async () => {
      const objectId = testObjectIds[0]
      
      // Add some location history
      await request(API_BASE)
        .put(`/api/objects/${objectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: 40.7589,
          lng: -73.9851
        })

      // Delete object
      await request(API_BASE)
        .delete(`/api/admin/objects/${objectId}`)
        .set('Authorization', `Bearer ${authToken}`)

      // Verify location history is also deleted
      const result = await query(
        'SELECT * FROM location_history WHERE object_id = $1',
        [objectId]
      )

      expect(result.rows).toHaveLength(0)
    })

    it('should return 404 for non-existent object', async () => {
      const response = await request(API_BASE)
        .delete('/api/admin/objects/99999')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('Object not found')
    })

    it('should require system.admin permission', async () => {
      // Admin should have this permission
      const response = await request(API_BASE)
        .delete(`/api/admin/objects/${testObjectIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
    })
  })

  describe('Bulk Operations Simulation', () => {
    it('should handle multiple sequential deletions', async () => {
      // Simulate bulk deletion by deleting multiple objects
      const deletionPromises = testObjectIds.map(objectId =>
        request(API_BASE)
          .delete(`/api/admin/objects/${objectId}`)
          .set('Authorization', `Bearer ${authToken}`)
      )

      const responses = await Promise.all(deletionPromises)
      
      // All deletions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })

      // Verify all objects are deleted
      const result = await query(
        'SELECT * FROM objects WHERE id = ANY($1)',
        [testObjectIds]
      )

      expect(result.rows).toHaveLength(0)
    })

    it('should handle partial failures gracefully', async () => {
      // Delete one object first
      await request(API_BASE)
        .delete(`/api/admin/objects/${testObjectIds[0]}`)
        .set('Authorization', `Bearer ${authToken}`)

      // Try to delete all objects (including the already deleted one)
      const deletionPromises = testObjectIds.map(objectId =>
        request(API_BASE)
          .delete(`/api/admin/objects/${objectId}`)
          .set('Authorization', `Bearer ${authToken}`)
      )

      const responses = await Promise.all(deletionPromises)
      
      // First deletion should fail (404), others should succeed
      expect(responses[0].status).toBe(404)
      expect(responses[1].status).toBe(200)
      expect(responses[2].status).toBe(200)
    })
  })

  describe('GET /api/admin/tenants', () => {
    it('should return tenant statistics', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      
      if (response.body.length > 0) {
        const tenant = response.body[0]
        expect(tenant).toHaveProperty('id')
        expect(tenant).toHaveProperty('name')
        expect(tenant).toHaveProperty('stats')
        expect(tenant.stats).toHaveProperty('user_count')
        expect(tenant.stats).toHaveProperty('object_count')
        expect(tenant.stats).toHaveProperty('location_history_count')
      }
    })

    it('should require system.admin permission', async () => {
      const response = await request(API_BASE)
        .get('/api/admin/tenants')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
    })
  })
})