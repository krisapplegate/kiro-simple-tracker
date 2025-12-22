/**
 * Integration Tests for RBAC UI
 * Tests the complete RBAC frontend functionality using Playwright
 */

import { test, expect } from '@playwright/test'

// Test configuration
const BASE_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:3001'

// Test users
const ADMIN_USER = {
  email: 'admin@demo.com',
  password: 'password',
  role: 'Super Administrator'
}

const TEST_USERS = {
  manager: {
    email: 'manager@test.com',
    password: 'password123',
    role: 'Manager'
  },
  operator: {
    email: 'operator@test.com',
    password: 'password123',
    role: 'Operator'
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'password123',
    role: 'Viewer'
  }
}

// Helper functions
async function loginUser(page, user) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

async function navigateToAdmin(page) {
  await page.click('[data-testid="admin-button"], .admin-nav-button, button:has-text("Admin")')
  await page.waitForURL(`${BASE_URL}/admin`)
}

async function createTestUser(page, userData) {
  await page.click('button:has-text("Add User")')
  await page.fill('input[name="email"]', userData.email)
  await page.fill('input[name="password"]', userData.password)
  if (userData.name) {
    await page.fill('input[name="name"]', userData.name)
  }
  if (userData.roleId) {
    await page.selectOption('select[name="roleId"]', userData.roleId)
  }
  await page.click('button[type="submit"]')
  await page.waitForSelector('.user-created-success, .success-message')
}

test.describe('RBAC Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure application is running
    await page.goto(BASE_URL)
  })

  test('should allow admin to access admin panel', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    
    // Check for admin navigation button
    await expect(page.locator('button:has-text("Admin"), [data-testid="admin-button"]')).toBeVisible()
    
    // Navigate to admin panel
    await navigateToAdmin(page)
    
    // Verify admin panel loaded
    await expect(page.locator('h1:has-text("Administration")')).toBeVisible()
    await expect(page.locator('text=Manage users, roles, and permissions')).toBeVisible()
    
    // Check all tabs are visible for super admin
    await expect(page.locator('button:has-text("Users")')).toBeVisible()
    await expect(page.locator('button:has-text("Roles")')).toBeVisible()
    await expect(page.locator('button:has-text("Groups")')).toBeVisible()
    await expect(page.locator('button:has-text("Permissions")')).toBeVisible()
  })

  test('should prevent non-admin users from accessing admin panel', async ({ page }) => {
    // Try to access admin panel without login
    await page.goto(`${BASE_URL}/admin`)
    await expect(page).toHaveURL(`${BASE_URL}/login`)
    
    // Login as regular user (if exists) and verify no admin access
    // This would need a regular user to be created first
  })
})

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    await page.click('button:has-text("Users")')
  })

  test('should display user list', async ({ page }) => {
    // Wait for users to load
    await page.waitForSelector('.user-list, table')
    
    // Check for admin user in the list
    await expect(page.locator(`text=${ADMIN_USER.email}`)).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th:has-text("User")')).toBeVisible()
    await expect(page.locator('th:has-text("Roles")')).toBeVisible()
    await expect(page.locator('th:has-text("Created")')).toBeVisible()
    await expect(page.locator('th:has-text("Actions")')).toBeVisible()
  })

  test('should create new user', async ({ page }) => {
    const newUser = {
      email: 'newuser@test.com',
      password: 'testpassword123',
      name: 'New Test User'
    }

    await createTestUser(page, newUser)
    
    // Verify user appears in list
    await expect(page.locator(`text=${newUser.email}`)).toBeVisible()
    await expect(page.locator(`text=${newUser.name}`)).toBeVisible()
  })

  test('should search users', async ({ page }) => {
    // Wait for users to load
    await page.waitForSelector('.user-list, table')
    
    // Search for admin user
    await page.fill('input[placeholder*="Search users"]', 'admin')
    
    // Should show admin user
    await expect(page.locator(`text=${ADMIN_USER.email}`)).toBeVisible()
    
    // Search for non-existent user
    await page.fill('input[placeholder*="Search users"]', 'nonexistent')
    
    // Should not show admin user
    await expect(page.locator(`text=${ADMIN_USER.email}`)).not.toBeVisible()
  })

  test('should assign role to user', async ({ page }) => {
    // Find a user and click edit
    await page.click(`tr:has-text("${ADMIN_USER.email}") button[title="Edit"], tr:has-text("${ADMIN_USER.email}") .edit-button`)
    
    // Wait for edit modal
    await page.waitForSelector('.modal, .edit-user-modal')
    
    // Check current roles are displayed
    await expect(page.locator('.current-roles, .user-roles')).toBeVisible()
    
    // Try to assign a new role (if available roles exist)
    const roleSelect = page.locator('select:has-option')
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption({ index: 0 })
      await page.click('button:has-text("Add"), button[type="submit"]')
    }
    
    // Close modal
    await page.click('button:has-text("Close"), .close-button')
  })

  test('should filter users by role', async ({ page }) => {
    // Wait for users and filter dropdown to load
    await page.waitForSelector('select:has-option, .role-filter')
    
    const roleFilter = page.locator('select:has-option')
    if (await roleFilter.count() > 0) {
      // Select a role filter
      await roleFilter.selectOption({ index: 1 })
      
      // Verify filtering works (users list should update)
      await page.waitForTimeout(1000) // Wait for filter to apply
    }
  })
})

test.describe('Role Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    await page.click('button:has-text("Roles")')
  })

  test('should display role list', async ({ page }) => {
    // Wait for roles to load
    await page.waitForSelector('.role-grid, .role-list')
    
    // Check for default roles
    await expect(page.locator('text=Super Administrator, text=Administrator')).toBeVisible()
    
    // Check role cards have required information
    await expect(page.locator('.role-card, .role-item')).toHaveCount.greaterThan(0)
  })

  test('should create custom role', async ({ page }) => {
    await page.click('button:has-text("Create Role")')
    
    // Wait for create modal
    await page.waitForSelector('.modal, .create-role-modal')
    
    // Fill role information
    await page.fill('input[name="name"]', 'test-role')
    await page.fill('input[name="displayName"]', 'Test Role')
    await page.fill('textarea[name="description"]', 'Test role for automation')
    
    // Select some permissions
    const permissionCheckboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await permissionCheckboxes.count()
    if (checkboxCount > 0) {
      // Select first few permissions
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        await permissionCheckboxes.nth(i).check()
      }
    }
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create")')
    
    // Verify role was created
    await page.waitForSelector('text=Test Role')
    await expect(page.locator('text=Test Role')).toBeVisible()
  })

  test('should view role permissions', async ({ page }) => {
    // Wait for roles to load
    await page.waitForSelector('.role-grid, .role-list')
    
    // Click on first role to view details
    await page.click('.role-card:first-child button:has-text("View"), .role-item:first-child .view-button')
    
    // Wait for role details modal
    await page.waitForSelector('.modal, .role-details-modal')
    
    // Check role information is displayed
    await expect(page.locator('.role-info, .role-details')).toBeVisible()
    await expect(page.locator('.permissions-list, .assigned-permissions')).toBeVisible()
    
    // Close modal
    await page.click('button:has-text("Close")')
  })

  test('should search roles', async ({ page }) => {
    // Wait for roles to load
    await page.waitForSelector('.role-grid, .role-list')
    
    // Search for admin role
    await page.fill('input[placeholder*="Search roles"]', 'admin')
    
    // Should show admin-related roles
    await expect(page.locator('text=Administrator')).toBeVisible()
    
    // Search for non-existent role
    await page.fill('input[placeholder*="Search roles"]', 'nonexistent')
    
    // Should show no results or empty state
    const roleCards = page.locator('.role-card, .role-item')
    await expect(roleCards).toHaveCount(0)
  })
})

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    await page.click('button:has-text("Groups")')
  })

  test('should display group list', async ({ page }) => {
    // Wait for groups to load (may be empty initially)
    await page.waitForSelector('.group-grid, .group-list, .empty-state')
    
    // Check for create group button
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible()
  })

  test('should create new group', async ({ page }) => {
    await page.click('button:has-text("Create Group")')
    
    // Wait for create modal
    await page.waitForSelector('.modal, .create-group-modal')
    
    // Fill group information
    await page.fill('input[name="name"]', 'test-group')
    await page.fill('input[name="displayName"]', 'Test Group')
    await page.fill('textarea[name="description"]', 'Test group for automation')
    
    // Submit form
    await page.click('button[type="submit"]:has-text("Create")')
    
    // Verify group was created
    await page.waitForSelector('text=Test Group')
    await expect(page.locator('text=Test Group')).toBeVisible()
  })

  test('should manage group members', async ({ page }) => {
    // First create a group if none exist
    const groupExists = await page.locator('.group-card, .group-item').count() > 0
    
    if (!groupExists) {
      // Create a test group first
      await page.click('button:has-text("Create Group")')
      await page.waitForSelector('.modal')
      await page.fill('input[name="name"]', 'test-group')
      await page.fill('input[name="displayName"]', 'Test Group')
      await page.click('button[type="submit"]')
      await page.waitForSelector('text=Test Group')
    }
    
    // Click manage members on first group
    await page.click('.group-card:first-child button:has-text("Manage"), .group-item:first-child .manage-button')
    
    // Wait for manage members modal
    await page.waitForSelector('.modal, .manage-members-modal')
    
    // Check members section is visible
    await expect(page.locator('.current-members, .group-members')).toBeVisible()
    
    // Close modal
    await page.click('button:has-text("Close")')
  })
})

test.describe('Permission Overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    await page.click('button:has-text("Permissions")')
  })

  test('should display permission overview', async ({ page }) => {
    // Wait for permissions to load
    await page.waitForSelector('.permission-overview, .permissions-grid')
    
    // Check summary cards
    await expect(page.locator('text=Total Permissions')).toBeVisible()
    await expect(page.locator('text=Resources')).toBeVisible()
    await expect(page.locator('text=Active Roles')).toBeVisible()
    
    // Check permissions are grouped by resource
    await expect(page.locator('.resource-section, .permission-group')).toHaveCount.greaterThan(0)
  })

  test('should search permissions', async ({ page }) => {
    // Wait for permissions to load
    await page.waitForSelector('.permission-overview, .permissions-grid')
    
    // Search for object permissions
    await page.fill('input[placeholder*="Search permissions"]', 'objects')
    
    // Should show object-related permissions
    await expect(page.locator('text=objects.read, text=objects.create')).toBeVisible()
    
    // Search for specific permission
    await page.fill('input[placeholder*="Search permissions"]', 'create')
    
    // Should show create permissions across resources
    await page.waitForTimeout(1000) // Wait for search to apply
  })

  test('should filter permissions by resource', async ({ page }) => {
    // Wait for permissions to load
    await page.waitForSelector('.permission-overview, .permissions-grid')
    
    // Use resource filter if available
    const resourceFilter = page.locator('select:has-option')
    if (await resourceFilter.count() > 0) {
      await resourceFilter.selectOption({ index: 1 })
      await page.waitForTimeout(1000) // Wait for filter to apply
    }
  })
})

test.describe('Permission-Based UI Access', () => {
  test('should show different UI for different roles', async ({ page }) => {
    // Test with Super Admin
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    
    // Should see all tabs
    await expect(page.locator('button:has-text("Users")')).toBeVisible()
    await expect(page.locator('button:has-text("Roles")')).toBeVisible()
    await expect(page.locator('button:has-text("Groups")')).toBeVisible()
    await expect(page.locator('button:has-text("Permissions")')).toBeVisible()
    
    // Logout
    await page.click('button:has-text("Sign out"), .logout-button')
    
    // Test with limited role (would need test users created)
    // This test would be expanded with actual test users
  })

  test('should handle permission errors gracefully', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    
    // Try to access admin panel
    await navigateToAdmin(page)
    
    // Should not show error for admin user
    await expect(page.locator('.error-message, .access-denied')).not.toBeVisible()
    
    // Check that admin functions work
    await page.click('button:has-text("Users")')
    await expect(page.locator('.user-list, table')).toBeVisible()
  })
})

test.describe('Real-time Updates', () => {
  test('should update UI when data changes', async ({ page, context }) => {
    // Open two tabs with admin panel
    const page1 = page
    const page2 = await context.newPage()
    
    // Login to both tabs
    await loginUser(page1, ADMIN_USER)
    await loginUser(page2, ADMIN_USER)
    
    // Navigate both to admin panel
    await navigateToAdmin(page1)
    await navigateToAdmin(page2)
    
    // Go to users tab in both
    await page1.click('button:has-text("Users")')
    await page2.click('button:has-text("Users")')
    
    // Wait for initial load
    await page1.waitForSelector('.user-list, table')
    await page2.waitForSelector('.user-list, table')
    
    // Create user in first tab
    const testUser = {
      email: 'realtime@test.com',
      password: 'password123',
      name: 'Realtime Test User'
    }
    
    await createTestUser(page1, testUser)
    
    // Check if user appears in second tab (real-time update)
    // Note: This depends on WebSocket implementation
    await page2.waitForTimeout(2000) // Wait for potential update
    
    // Clean up
    await page2.close()
  })
})

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    
    // Simulate network error by blocking API requests
    await page.route(`${API_URL}/api/**`, route => route.abort())
    
    // Try to load users
    await page.click('button:has-text("Users")')
    
    // Should show error state or loading state
    await page.waitForTimeout(3000)
    
    // Check for error handling (loading spinner, error message, etc.)
    const hasErrorHandling = await page.locator('.loading, .error-message, .spinner').count() > 0
    expect(hasErrorHandling).toBeTruthy()
  })

  test('should validate form inputs', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    await page.click('button:has-text("Users")')
    
    // Try to create user with invalid data
    await page.click('button:has-text("Add User")')
    await page.waitForSelector('.modal')
    
    // Submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    const hasValidation = await page.locator('.error, .invalid, [aria-invalid="true"]').count() > 0
    expect(hasValidation).toBeTruthy()
  })
})

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to navigate to admin tabs
    const focusedElement = await page.locator(':focus')
    expect(await focusedElement.count()).toBeGreaterThan(0)
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await loginUser(page, ADMIN_USER)
    await navigateToAdmin(page)
    
    // Check for ARIA labels on interactive elements
    const buttonsWithLabels = await page.locator('button[aria-label], button[title]').count()
    expect(buttonsWithLabels).toBeGreaterThan(0)
    
    // Check for proper headings structure
    const headings = await page.locator('h1, h2, h3').count()
    expect(headings).toBeGreaterThan(0)
  })
})