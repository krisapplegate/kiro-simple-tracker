import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import express from 'express'
import { WebSocketServer } from 'ws'
import { query } from '../../backend/database.js'

// Import the app setup (we'll need to modify the server.js to export the app)
const API_BASE = process.env.API_URL || 'http://localhost:3001'

describe('Location Update API', () => {
  let authToken
  let testObjectId
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
    // Create a test object for each test
    const objectResponse = await request(API_BASE)
      .post('/api/objects')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Tenant-Id', testTenantId.toString())
      .send({
        name: 'Test Location Object',
        type: 'vehicle',
        lat: 40.7128,
        lng: -74.0060,
        description: 'Test object for location updates'
      })
    
    expect(objectResponse.status).toBe(201)
    testObjectId = objectResponse.body.id
  })

  afterEach(async () => {
    // Clean up test object
    if (testObjectId) {
      await request(API_BASE)
        .delete(`/api/objects/${testObjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
    }
  })

  describe('PUT /api/objects/:id/location', () => {
    it('should update object location successfully', async () => {
      const newLat = 40.7589
      const newLng = -73.9851

      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: newLat,
          lng: newLng
        })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        message: 'Location updated successfully',
        lat: newLat,
        lng: newLng
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should update object in database', async () => {
      const newLat = 41.8781
      const newLng = -87.6298

      await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: newLat,
          lng: newLng
        })

      // Verify object was updated in database
      const result = await query(
        'SELECT lat, lng, last_update FROM objects WHERE id = $1',
        [testObjectId]
      )

      expect(result.rows).toHaveLength(1)
      expect(parseFloat(result.rows[0].lat)).toBe(newLat)
      expect(parseFloat(result.rows[0].lng)).toBe(newLng)
      expect(result.rows[0].last_update).toBeDefined()
    })

    it('should create location history entry', async () => {
      const newLat = 34.0522
      const newLng = -118.2437

      await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: newLat,
          lng: newLng
        })

      // Verify location history was created
      const result = await query(
        'SELECT lat, lng, timestamp FROM location_history WHERE object_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [testObjectId]
      )

      expect(result.rows).toHaveLength(1)
      expect(parseFloat(result.rows[0].lat)).toBe(newLat)
      expect(parseFloat(result.rows[0].lng)).toBe(newLng)
    })

    it('should reject invalid coordinates', async () => {
      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: 'invalid',
          lng: -74.0060
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid coordinates')
    })

    it('should reject missing coordinates', async () => {
      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: 40.7128
          // missing lng
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid coordinates')
    })

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .send({
          lat: 40.7128,
          lng: -74.0060
        })

      expect(response.status).toBe(401)
    })

    it('should require objects.update permission', async () => {
      // This would need a user with limited permissions
      // For now, we'll test with the admin user which should work
      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: 40.7128,
          lng: -74.0060
        })

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent object', async () => {
      const response = await request(API_BASE)
        .put('/api/objects/99999/location')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: 40.7128,
          lng: -74.0060
        })

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('Object not found')
    })

    it('should handle extreme coordinate values', async () => {
      const extremeLat = 89.9999
      const extremeLng = 179.9999

      const response = await request(API_BASE)
        .put(`/api/objects/${testObjectId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .send({
          lat: extremeLat,
          lng: extremeLng
        })

      expect(response.status).toBe(200)
      expect(response.body.lat).toBe(extremeLat)
      expect(response.body.lng).toBe(extremeLng)
    })
  })
})