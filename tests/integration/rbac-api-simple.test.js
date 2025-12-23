/**
 * Simplified RBAC API Integration Tests
 * Basic tests to verify core functionality without complex setup
 */

import { describe, it, expect } from 'vitest'
import request from 'supertest'

// Test configuration
const API_URL = 'http://localhost:3001'

// Test users
const testUsers = {
  admin: { email: 'admin@demo.com', password: 'password' }
}

// Helper functions
async function loginUser(email, password) {
  const response = await request(API_URL)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
  
  return response.body.token
}

describe('RBAC API Simple Tests', () => {
  it('should connect to backend server', async () => {
    const response = await request(API_URL)
      .get('/api/health')
      .expect(200)
    
    expect(response.body.status).toBe('OK')
  })

  it('should login with admin credentials', async () => {
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

  it('should list roles for admin user', async () => {
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({ 
        email: testUsers.admin.email, 
        password: testUsers.admin.password 
      })
      .expect(200)
    
    const adminToken = loginResponse.body.token
    const tenantId = loginResponse.body.user.tenant.id
    
    const response = await request(API_URL)
      .get('/api/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', tenantId.toString())
      .expect(200)
    
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
  })

  it('should list users for admin user', async () => {
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({ 
        email: testUsers.admin.email, 
        password: testUsers.admin.password 
      })
      .expect(200)
    
    const adminToken = loginResponse.body.token
    const tenantId = loginResponse.body.user.tenant.id
    
    const response = await request(API_URL)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-Id', tenantId.toString())
      .expect(200)
    
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.length).toBeGreaterThan(0)
  })
})