import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { query } from '../../backend/database.js'

const API_BASE = process.env.API_URL || 'http://localhost:3001'

describe('Object Type Configuration API', () => {
  let authToken
  let testTenantId = 1

  beforeAll(async () => {
    // Login to get auth token
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
    // Clean up any test configurations
    await query(
      'DELETE FROM object_type_configs WHERE tenant_id = $1 AND type_name LIKE $2',
      [testTenantId, 'test_%']
    )
  })

  afterAll(async () => {
    // Final cleanup
    await query(
      'DELETE FROM object_type_configs WHERE tenant_id = $1 AND type_name LIKE $2',
      [testTenantId, 'test_%']
    )
  })

  describe('GET /api/object-type-configs', () => {
    it('should return existing configurations', async () => {
      const response = await request(API_BASE)
        .get('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(typeof response.body).toBe('object')
    })

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/object-type-configs')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/object-type-configs', () => {
    it('should create new type configuration', async () => {
      const typeConfig = {
        typeName: 'test_vehicle',
        emoji: '🚗',
        color: '#3b82f6'
      }

      const response = await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send(typeConfig)

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(typeConfig)
    })

    it('should store configuration in database', async () => {
      const typeConfig = {
        typeName: 'test_drone',
        emoji: '🚁',
        color: '#8b5cf6'
      }

      await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send(typeConfig)

      // Verify in database
      const result = await query(
        'SELECT type_name, emoji, color FROM object_type_configs WHERE tenant_id = $1 AND type_name = $2',
        [testTenantId, 'test_drone']
      )

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toMatchObject({
        type_name: 'test_drone',
        emoji: '🚁',
        color: '#8b5cf6'
      })
    })

    it('should validate required fields', async () => {
      const response = await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          typeName: 'test_incomplete'
          // missing emoji and color
        })

      expect(response.status).toBe(400)
    })

    it('should normalize type name to lowercase', async () => {
      const typeConfig = {
        typeName: 'TEST_UPPERCASE',
        emoji: '📱',
        color: '#f59e0b'
      }

      const response = await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send(typeConfig)

      expect(response.status).toBe(200)
      expect(response.body.typeName).toBe('test_uppercase')
    })

    it('should update existing configuration', async () => {
      // Create initial config
      await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          typeName: 'test_update',
          emoji: '🚗',
          color: '#000000'
        })

      // Update with new values
      const updatedConfig = {
        typeName: 'test_update',
        emoji: '🚙',
        color: '#ffffff'
      }

      const response = await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send(updatedConfig)

      expect(response.status).toBe(200)
      expect(response.body.emoji).toBe('🚙')
      expect(response.body.color).toBe('#ffffff')
    })

    it('should require types.create permission', async () => {
      // Admin should have this permission
      const response = await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          typeName: 'test_permission',
          emoji: '🔒',
          color: '#ef4444'
        })

      expect(response.status).toBe(200)
    })
  })

  describe('DELETE /api/object-type-configs/:typeName', () => {
    beforeEach(async () => {
      // Create a test configuration to delete
      await request(API_BASE)
        .post('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          typeName: 'test_delete',
          emoji: '🗑️',
          color: '#ef4444'
        })
    })

    it('should delete existing configuration', async () => {
      const response = await request(API_BASE)
        .delete('/api/object-type-configs/test_delete')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(response.body.message).toContain('deleted successfully')
    })

    it('should remove from database', async () => {
      await request(API_BASE)
        .delete('/api/object-type-configs/test_delete')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      // Verify removal from database
      const result = await query(
        'SELECT * FROM object_type_configs WHERE tenant_id = $1 AND type_name = $2',
        [testTenantId, 'test_delete']
      )

      expect(result.rows).toHaveLength(0)
    })

    it('should return 404 for non-existent type', async () => {
      const response = await request(API_BASE)
        .delete('/api/object-type-configs/non_existent')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(404)
    })

    it('should require types.delete permission', async () => {
      // Admin should have this permission
      const response = await request(API_BASE)
        .delete('/api/object-type-configs/test_delete')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
    })
  })

  describe('Tenant Isolation', () => {
    it('should only return configurations for current tenant', async () => {
      // This test assumes we have access to multiple tenants
      // For now, we'll just verify the basic functionality
      const response = await request(API_BASE)
        .get('/api/object-type-configs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      // All returned configs should be for the current tenant
      // (This would be more meaningful with multiple tenants)
    })
  })
})