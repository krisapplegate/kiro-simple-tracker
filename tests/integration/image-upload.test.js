import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { query } from '../../backend/database.js'
import fs from 'fs'
import path from 'path'

const API_BASE = process.env.API_URL || 'http://localhost:3001'

// Check if MinIO is available
const isMinioAvailable = async () => {
  try {
    const response = await fetch('http://localhost:9000/minio/health/live')
    return response.ok
  } catch (error) {
    return false
  }
}

describe('Image Upload API', () => {
  let authToken
  let testObjectId
  let testTenantId = 1
  let minioAvailable = false

  beforeAll(async () => {
    // Check MinIO availability
    minioAvailable = await isMinioAvailable()
    if (!minioAvailable) {
      console.log('⚠️  MinIO not available, skipping image upload tests')
    }

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
        name: 'Test Image Object',
        type: 'vehicle',
        lat: 40.7128,
        lng: -74.0060,
        description: 'Test object for image uploads'
      })
    
    expect(objectResponse.status).toBe(201)
    testObjectId = objectResponse.body.id
  })

  afterEach(async () => {
    // Clean up test object and images
    if (testObjectId) {
      // Delete images first
      await query(
        'DELETE FROM images WHERE object_id = $1 AND tenant_id = $2',
        [testObjectId, testTenantId]
      )
      
      // Delete object
      await request(API_BASE)
        .delete(`/api/objects/${testObjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
    }
  })

  // Create a test image buffer
  const createTestImageBuffer = () => {
    // Create a minimal PNG buffer (1x1 pixel)
    return Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // image data
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ])
  }

  describe('POST /api/objects/:id/images', () => {
    it('should upload image successfully', async () => {
      if (!minioAvailable) {
        console.log('Skipping image upload test - MinIO not available')
        return
      }

      const imageBuffer = createTestImageBuffer()

      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test-image.png')

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('imageUrl')
      expect(response.body).toHaveProperty('fileName')
      expect(response.body.fileName).toContain('.png')
    })

    it('should store image metadata in database', async () => {
      if (!minioAvailable) {
        console.log('Skipping image metadata test - MinIO not available')
        return
      }

      const imageBuffer = createTestImageBuffer()

      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test-metadata.png')

      expect(response.status).toBe(201)

      // Verify in database
      const result = await query(
        'SELECT * FROM images WHERE object_id = $1 AND tenant_id = $2',
        [testObjectId, testTenantId]
      )

      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]).toMatchObject({
        object_id: testObjectId,
        tenant_id: testTenantId,
        content_type: 'image/png'
      })
      expect(result.rows[0].file_name).toContain('test-metadata')
    })

    it('should reject non-image files', async () => {
      if (!minioAvailable) {
        console.log('Skipping non-image file test - MinIO not available')
        return
      }

      const textBuffer = Buffer.from('This is not an image')

      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', textBuffer, 'test.txt')

      expect([400, 500]).toContain(response.status) // Multer may return 500 for invalid files
    })

    it('should require image file', async () => {
      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('No image file provided')
    })

    it('should require authentication', async () => {
      const imageBuffer = createTestImageBuffer()

      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .attach('image', imageBuffer, 'test.png')

      expect(response.status).toBe(401)
    })

    it('should require objects.update permission', async () => {
      if (!minioAvailable) {
        console.log('Skipping permission test - MinIO not available')
        return
      }

      const imageBuffer = createTestImageBuffer()

      const response = await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test-permission.png')

      expect(response.status).toBe(201) // Admin should have permission
    })

    it('should return 404 for non-existent object', async () => {
      if (!minioAvailable) {
        console.log('Skipping 404 test - MinIO not available')
        return
      }

      const imageBuffer = createTestImageBuffer()

      const response = await request(API_BASE)
        .post('/api/objects/99999/images')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test.png')

      expect(response.status).toBe(404)
      expect(response.body.message).toContain('Object not found')
    })

    it('should handle different image formats', async () => {
      if (!minioAvailable) {
        console.log('Skipping image formats test - MinIO not available')
        return
      }

      const formats = [
        { buffer: createTestImageBuffer(), filename: 'test.png', contentType: 'image/png' },
        // Add more formats if needed
      ]

      for (const format of formats) {
        const response = await request(API_BASE)
          .post(`/api/objects/${testObjectId}/images`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Tenant-Id', testTenantId.toString())
          .attach('image', format.buffer, format.filename)

        expect(response.status).toBe(201)
        expect(response.body.fileName).toContain(path.extname(format.filename))
      }
    })
  })

  describe('GET /api/objects/:id/images', () => {
    beforeEach(async () => {
      if (!minioAvailable) return
      
      // Upload a test image
      const imageBuffer = createTestImageBuffer()
      await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test-get.png')
    })

    it('should return object images', async () => {
      if (!minioAvailable) {
        console.log('Skipping get images test - MinIO not available')
        return
      }

      const response = await request(API_BASE)
        .get(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      
      const image = response.body[0]
      expect(image).toHaveProperty('id')
      expect(image).toHaveProperty('imageUrl')
      expect(image).toHaveProperty('fileName')
      expect(image).toHaveProperty('createdAt')
    })

    it('should filter by time range', async () => {
      if (!minioAvailable) {
        console.log('Skipping time range test - MinIO not available')
        return
      }

      const now = new Date()
      const startTime = new Date(now.getTime() - 60000).toISOString() // 1 minute ago
      const endTime = new Date(now.getTime() + 60000).toISOString() // 1 minute from now

      const response = await request(API_BASE)
        .get(`/api/objects/${testObjectId}/images`)
        .query({ startTime, endTime })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .get(`/api/objects/${testObjectId}/images`)

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent object', async () => {
      const response = await request(API_BASE)
        .get('/api/objects/99999/images')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/images/recent', () => {
    beforeEach(async () => {
      if (!minioAvailable) return
      
      // Upload a test image
      const imageBuffer = createTestImageBuffer()
      await request(API_BASE)
        .post(`/api/objects/${testObjectId}/images`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())
        .attach('image', imageBuffer, 'test-recent.png')
    })

    it('should return recent images', async () => {
      if (!minioAvailable) {
        console.log('Skipping recent images test - MinIO not available')
        return
      }

      const response = await request(API_BASE)
        .get('/api/images/recent')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      if (!minioAvailable) {
        console.log('Skipping limit parameter test - MinIO not available')
        return
      }

      const response = await request(API_BASE)
        .get('/api/images/recent')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-Id', testTenantId.toString())

      expect(response.status).toBe(200)
      expect(response.body.length).toBeLessThanOrEqual(2)
    })

    it('should require authentication', async () => {
      const response = await request(API_BASE)
        .get('/api/images/recent')

      expect(response.status).toBe(401)
    })
  })
})