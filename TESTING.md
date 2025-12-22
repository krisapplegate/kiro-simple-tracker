# Testing Guide

This document provides comprehensive information about testing the Location Tracker application, with a focus on the RBAC (Role-Based Access Control) system and UI components.

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── rbac.test.js        # RBAC service tests
│   └── user.test.js        # User model tests
├── integration/            # Integration tests
│   ├── rbac-api.test.js    # RBAC API tests
│   └── rbac-ui.test.js     # RBAC UI tests (Playwright)
├── setup.js               # Global test setup
├── vitest.config.js       # Vitest configuration
└── playwright.config.js   # Playwright configuration
```

## Prerequisites

### Required Dependencies

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8 @playwright/test supertest jest

# Install Playwright browsers
npx playwright install
```

### Environment Setup

1. **Start the application:**
```bash
./docker-start.sh dev
```

2. **Verify health:**
```bash
curl http://localhost:3001/api/health
```

3. **Ensure test data exists:**
```bash
# Login as admin to verify RBAC system
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}'
```

## Running Tests

### Using Docker Helper Script (Recommended)

The `./docker-start.sh` script provides convenient testing commands:

```bash
# Setup test environment (install dependencies, browsers, start app)
./docker-start.sh test-setup

# Run all tests (unit + integration + UI)
./docker-start.sh test

# Run specific test suites
./docker-start.sh test-unit    # Unit tests only
./docker-start.sh test-api     # API integration tests
./docker-start.sh test-ui      # UI tests with Playwright
./docker-start.sh test-rbac    # RBAC-specific tests

# Cleanup test environment
./docker-start.sh test-cleanup
```

### Using NPM Scripts Directly

```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:api           # API integration tests
npm run test:ui            # UI tests with Playwright
npm run test:rbac          # RBAC-specific tests
```

### Development Workflow

#### Quick Start with Docker
```bash
# One-time setup
./docker-start.sh test-setup

# Run tests during development
./docker-start.sh test-unit    # Fast unit tests
./docker-start.sh test-api     # API integration tests
./docker-start.sh test-ui      # Full UI tests

# Cleanup when done
./docker-start.sh test-cleanup
```

#### Advanced Testing with NPM
```bash
# Run tests in watch mode
npm run test:unit:watch

# Run UI tests with browser visible
npm run test:ui:headed

# Debug UI tests
npm run test:ui:debug
```

## Test Categories

### 1. Unit Tests

#### RBAC Service Tests (`tests/unit/rbac.test.js`)

**Coverage:**
- User permission retrieval
- Permission checking logic
- Object access control
- Role management
- Group management
- Permission validation
- Role hierarchy validation

**Key Test Cases:**
```javascript
// Permission checking
describe('hasPermission', () => {
  it('should return true when user has permission')
  it('should return false when user lacks permission')
  it('should return false on database error')
})

// Object access control
describe('canAccessObject', () => {
  it('should allow access with manage permission')
  it('should check ownership for non-manage users')
  it('should deny access for non-owners without manage permission')
})

// Role management
describe('createRole', () => {
  it('should create role with permissions')
  it('should handle role creation without permissions')
})
```

#### User Model Tests (`tests/unit/user.test.js`)

**Coverage:**
- User authentication
- Password hashing and verification
- User creation and retrieval
- Email validation
- Role validation

**Key Test Cases:**
```javascript
// Authentication
describe('verifyPassword', () => {
  it('should return true for correct password')
  it('should return false for incorrect password')
  it('should handle empty passwords')
})

// User management
describe('create', () => {
  it('should create user with hashed password')
  it('should use default role when not specified')
})
```

### 2. API Integration Tests

#### RBAC API Tests (`tests/integration/rbac-api.test.js`)

**Coverage:**
- Authentication endpoints
- Role management APIs
- Permission management APIs
- User management APIs
- Group management APIs
- Permission-based access control
- Object ownership
- Error handling

**Key Test Cases:**
```javascript
// Authentication
describe('Authentication', () => {
  it('should login with valid credentials')
  it('should reject invalid credentials')
  it('should validate token and return user permissions')
})

// Permission-based access
describe('Permission-Based Access Control', () => {
  it('should allow admin to access all endpoints')
  it('should restrict viewer to read-only access')
  it('should allow operator to manage objects but not users')
})

// Object ownership
describe('Object Ownership', () => {
  it('should allow users to delete own objects')
  it('should prevent users from deleting others objects')
  it('should allow admin to delete any object')
})
```

### 3. UI Integration Tests

#### RBAC UI Tests (`tests/integration/rbac-ui.test.js`)

**Coverage:**
- Admin panel access
- User management interface
- Role management interface
- Group management interface
- Permission overview interface
- Permission-based UI rendering
- Real-time updates
- Error handling
- Accessibility

**Key Test Cases:**
```javascript
// Admin panel access
describe('RBAC Admin Panel', () => {
  it('should allow admin to access admin panel')
  it('should prevent non-admin users from accessing admin panel')
})

// User management
describe('User Management', () => {
  it('should display user list')
  it('should create new user')
  it('should assign role to user')
  it('should search users')
})

// Permission-based UI
describe('Permission-Based UI Access', () => {
  it('should show different UI for different roles')
  it('should handle permission errors gracefully')
})
```

## Test Data

### Default Test Users

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `admin@demo.com` | `password` | Super Administrator | All 32 permissions |
| `manager@test.com` | `password123` | Manager | 16 permissions |
| `operator@test.com` | `password123` | Operator | 12 permissions |
| `viewer@test.com` | `password123` | Viewer | 7 permissions |
| `user@test.com` | `password123` | User | 6 permissions |

### Test Roles

1. **Super Administrator** (32 permissions)
2. **Administrator** (31 permissions)
3. **Manager** (16 permissions)
4. **Operator** (12 permissions)
5. **Viewer** (7 permissions)
6. **User** (6 permissions)

### Test Permissions

The system includes 32 granular permissions across 6 resources:

- **Objects**: read, create, update, delete, manage (5 permissions)
- **Users**: read, create, update, delete, manage (5 permissions)
- **Roles**: read, create, update, delete, manage (5 permissions)
- **Groups**: read, create, update, delete, manage (5 permissions)
- **Types**: read, create, update, delete, manage (5 permissions)
- **Icons**: read, create, update, delete, manage (5 permissions)
- **System**: admin (1 permission)

## Test Scenarios

### 1. Authentication Testing

```bash
# Valid login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}'

# Invalid login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"wrong"}'

# Token validation
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/validate
```

### 2. Permission Testing

```bash
# Get user permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/validate | jq '.permissions'

# Test permission-protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/rbac/roles
```

### 3. Role Management Testing

```bash
# List roles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/rbac/roles

# Create custom role
curl -X POST http://localhost:3001/api/rbac/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-role",
    "displayName": "Test Role",
    "description": "Test role for automation",
    "permissions": [1, 2, 3]
  }'
```

### 4. User Management Testing

```bash
# List users
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/users

# Create user
curl -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Assign role to user
curl -X POST http://localhost:3001/api/rbac/users/2/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleId": 3}'
```

### 5. Object Ownership Testing

```bash
# Create object as user
USER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' | jq -r '.token')

OBJECT_ID=$(curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Object",
    "type": "test",
    "lat": 37.7749,
    "lng": -122.4194
  }' | jq -r '.id')

# Try to delete as different user (should fail)
curl -X DELETE http://localhost:3001/api/objects/$OBJECT_ID \
  -H "Authorization: Bearer $TOKEN"

# Delete as owner (should succeed)
curl -X DELETE http://localhost:3001/api/objects/$OBJECT_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

## UI Testing with Playwright

### Test Structure

```javascript
// Login helper
async function loginUser(page, user) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

// Admin panel navigation
async function navigateToAdmin(page) {
  await page.click('[data-testid="admin-button"]')
  await page.waitForURL(`${BASE_URL}/admin`)
}
```

### Key UI Test Scenarios

1. **Admin Panel Access**
   - Verify admin users can access admin panel
   - Verify non-admin users are redirected
   - Check all tabs are visible for appropriate roles

2. **User Management**
   - Create new users
   - Assign/remove roles
   - Search and filter users
   - Edit user details

3. **Role Management**
   - View role list
   - Create custom roles with permissions
   - View role details and permissions
   - Search roles

4. **Group Management**
   - Create groups
   - Add/remove users from groups
   - Manage group details

5. **Permission Overview**
   - View permission summary
   - Search and filter permissions
   - Analyze permission usage

## Coverage Reports

### Unit Test Coverage

```bash
npm run test:unit:coverage
```

**Target Coverage:**
- **Lines**: > 80%
- **Functions**: > 80%
- **Branches**: > 70%
- **Statements**: > 80%

### Integration Test Coverage

Integration tests cover:
- All RBAC API endpoints
- All permission combinations
- All user role scenarios
- Error handling paths
- UI component interactions

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start application
        run: |
          ./docker-start.sh dev
          sleep 30
      
      - name: Run unit tests
        run: npm run test:unit:coverage
      
      - name: Run API tests
        run: npm run test:api
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Run UI tests
        run: npm run test:ui
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

1. **Tests fail with "Connection refused"**
   ```bash
   # Ensure application is running
   ./docker-start.sh dev
   curl http://localhost:3001/api/health
   ```

2. **Playwright tests fail with "Page not found"**
   ```bash
   # Check frontend is accessible
   curl http://localhost:3000
   
   # Restart containers if needed
   ./docker-start.sh stop
   ./docker-start.sh dev
   ```

3. **Database connection errors**
   ```bash
   # Check database status
   docker-compose ps
   ./docker-start.sh db
   ```

4. **Permission errors in tests**
   ```bash
   # Verify test users exist and have correct roles
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')
   
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/users | jq
   ```

### Debug Mode

1. **Unit Tests Debug:**
   ```bash
   npm run test:unit:watch
   # Add debugger statements in test files
   ```

2. **API Tests Debug:**
   ```bash
   # Add console.log statements
   DEBUG=supertest npm run test:api
   ```

3. **UI Tests Debug:**
   ```bash
   npm run test:ui:debug
   # Opens Playwright inspector
   ```

### Test Data Cleanup

```bash
# Reset test database (⚠️ removes all data)
./docker-start.sh clean
./docker-start.sh dev

# Or manually clean test users
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# List and manually delete test users if needed
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/users
```

## Best Practices

### Writing Tests

1. **Use descriptive test names**
   ```javascript
   it('should allow admin to create custom role with specific permissions')
   ```

2. **Test both success and failure cases**
   ```javascript
   it('should create user with valid data')
   it('should reject user creation with invalid email')
   ```

3. **Use proper assertions**
   ```javascript
   expect(response.body.permissions).toHaveLength(32)
   expect(response.body.email).toBe('admin@demo.com')
   ```

4. **Clean up test data**
   ```javascript
   afterEach(async () => {
     // Clean up created test data
   })
   ```

### UI Testing

1. **Use data-testid attributes**
   ```jsx
   <button data-testid="create-user-button">Create User</button>
   ```

2. **Wait for elements properly**
   ```javascript
   await page.waitForSelector('[data-testid="user-list"]')
   ```

3. **Test user workflows, not implementation**
   ```javascript
   // Good: Test user can create and assign role
   // Bad: Test specific API calls
   ```

### Performance

1. **Run tests in parallel when possible**
2. **Use test databases separate from development**
3. **Mock external services**
4. **Reuse authentication tokens**

This comprehensive testing setup ensures the RBAC system and UI components work correctly across all scenarios and user roles.