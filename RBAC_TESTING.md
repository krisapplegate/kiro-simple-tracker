# RBAC Testing Guide

This guide provides comprehensive instructions for testing the Role-Based Access Control (RBAC) system in the Location Tracker application.

## Overview

The RBAC system includes:
- **6 Default Roles** with different permission levels
- **32 Granular Permissions** across 6 resources
- **Group-based Organization** for team management
- **Multi-role Support** per user
- **Permission Inheritance** through groups

## Default Roles & Permissions

### Role Hierarchy (Permissions Count)

1. **Super Administrator** (32 permissions)
   - Full system access including system administration
   - Can manage all users, roles, groups, objects, and types
   - Default user: `admin@demo.com`

2. **Administrator** (31 permissions)
   - Full management except system administration
   - Can manage users, roles, groups, objects, and types
   - Cannot access system-level functions

3. **Manager** (16 permissions)
   - Team and object oversight
   - Can manage objects, users, groups, and types
   - Cannot manage roles or system functions

4. **Operator** (12 permissions)
   - Object and type management
   - Can create, read, update, delete objects and types
   - Cannot manage users, groups, or roles

5. **Viewer** (7 permissions)
   - Read-only access to all resources
   - Can view objects, users, groups, roles, types, and icons
   - Cannot create, update, or delete anything

6. **User** (6 permissions)
   - Basic object access for own objects only
   - Can create, read, update, delete own objects
   - Can view types and icons

## Testing Setup

### 1. Start the Application

```bash
# Start development environment
./docker-start.sh dev

# Verify health
./docker-start.sh health
```

### 2. Login as Super Administrator

```bash
# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

echo "Token: $TOKEN"
```

### 3. Verify Super Admin Permissions

```bash
# Check user permissions (should show all 32 permissions)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions | length'

# List all roles
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq '.[].name'

# List all permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/permissions | jq 'length'
```

## Permission Testing

### Object Permissions Testing

```bash
# Test objects.read permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/objects | jq

# Test objects.create permission
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Object",
    "type": "vehicle",
    "lat": 37.7749,
    "lng": -122.4194,
    "description": "RBAC test object"
  }' | jq

# Test objects.update permission (replace OBJECT_ID)
OBJECT_ID=1
curl -s -X PUT http://localhost:3001/api/objects/$OBJECT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Test Object"}' | jq

# Test objects.delete permission (replace OBJECT_ID)
curl -s -X DELETE http://localhost:3001/api/objects/$OBJECT_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Type Configuration Permissions Testing

```bash
# Test types.read permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/object-type-configs | jq

# Test types.create permission
curl -s -X POST http://localhost:3001/api/object-type-configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "typeName": "test-type",
    "emoji": "🧪",
    "color": "#ff0000"
  }' | jq

# Test types.delete permission
curl -s -X DELETE http://localhost:3001/api/object-type-configs/test-type \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Role Management Permissions Testing

```bash
# Test roles.read permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq 'length'

# Test roles.create permission
curl -s -X POST http://localhost:3001/api/rbac/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-role",
    "displayName": "Test Role",
    "description": "Role for RBAC testing",
    "permissions": [1, 2, 3]
  }' | jq
```

### Group Management Permissions Testing

```bash
# Test groups.read permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/groups | jq

# Test groups.create permission
curl -s -X POST http://localhost:3001/api/rbac/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "description": "Group for RBAC testing"
  }' | jq
```

## Multi-User Testing

### 1. Create Test Users with Different Roles

```bash
# Create users using database CLI
node database/manage.js createUser viewer@test.com password123 user 1
node database/manage.js createUser operator@test.com password123 user 1
node database/manage.js createUser manager@test.com password123 user 1

# Assign roles to users (using Super Admin token)
# Get role IDs first
VIEWER_ROLE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq '.[] | select(.name=="viewer") | .id')
OPERATOR_ROLE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq '.[] | select(.name=="operator") | .id')
MANAGER_ROLE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq '.[] | select(.name=="manager") | .id')

# Assign roles (replace USER_IDs with actual IDs from database)
curl -s -X POST http://localhost:3001/api/rbac/users/2/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roleId\": $VIEWER_ROLE_ID}" | jq

curl -s -X POST http://localhost:3001/api/rbac/users/3/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roleId\": $OPERATOR_ROLE_ID}" | jq

curl -s -X POST http://localhost:3001/api/rbac/users/4/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roleId\": $MANAGER_ROLE_ID}" | jq
```

### 2. Test Viewer Role (Read-Only Access)

```bash
# Login as viewer
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"password123"}' | jq -r '.token')

# Should work (read permissions)
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/objects | jq

# Should fail (no create permission)
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "vehicle", "lat": 37.7749, "lng": -122.4194}' | jq

# Check permissions (should show 7 read-only permissions)
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions | length'
```

### 3. Test Operator Role (Object Management)

```bash
# Login as operator
OPERATOR_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@test.com","password":"password123"}' | jq -r '.token')

# Should work (object permissions)
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Operator Test", "type": "vehicle", "lat": 37.7749, "lng": -122.4194}' | jq

# Should fail (no user management permission)
curl -s -H "Authorization: Bearer $OPERATOR_TOKEN" http://localhost:3001/api/rbac/users/1 | jq

# Check permissions (should show 12 permissions)
curl -s -H "Authorization: Bearer $OPERATOR_TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions | length'
```

### 4. Test Manager Role (Team Management)

```bash
# Login as manager
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@test.com","password":"password123"}' | jq -r '.token')

# Should work (user management)
curl -s -H "Authorization: Bearer $MANAGER_TOKEN" http://localhost:3001/api/rbac/users/2 | jq

# Should work (group management)
curl -s -X POST http://localhost:3001/api/rbac/groups \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Manager Test Group", "description": "Test group"}' | jq

# Should fail (no role management permission)
curl -s -X POST http://localhost:3001/api/rbac/roles \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "displayName": "Test"}' | jq

# Check permissions (should show 16 permissions)
curl -s -H "Authorization: Bearer $MANAGER_TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions | length'
```

## Object Ownership Testing

### 1. Create Objects with Different Users

```bash
# Create object as operator
OPERATOR_OBJECT=$(curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Operator Object", "type": "device", "lat": 37.7749, "lng": -122.4194}' | jq '.id')

# Create object as manager  
MANAGER_OBJECT=$(curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Manager Object", "type": "asset", "lat": 37.7749, "lng": -122.4194}' | jq '.id')
```

### 2. Test Ownership-Based Access

```bash
# Operator should be able to delete their own object
curl -s -X DELETE http://localhost:3001/api/objects/$OPERATOR_OBJECT \
  -H "Authorization: Bearer $OPERATOR_TOKEN" | jq

# Operator should NOT be able to delete manager's object (no objects.manage permission)
curl -s -X DELETE http://localhost:3001/api/objects/$MANAGER_OBJECT \
  -H "Authorization: Bearer $OPERATOR_TOKEN" | jq

# Super Admin should be able to delete any object (has objects.manage permission)
curl -s -X DELETE http://localhost:3001/api/objects/$MANAGER_OBJECT \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Group-Based Role Testing

### 1. Create Groups and Assign Roles

```bash
# Create a group
GROUP_ID=$(curl -s -X POST http://localhost:3001/api/rbac/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Team", "description": "Team for testing group roles"}' | jq '.id')

# Add user to group
curl -s -X POST http://localhost:3001/api/rbac/groups/$GROUP_ID/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": 2}' | jq

# Assign role to group (this will give the role to all group members)
curl -s -X POST http://localhost:3001/api/rbac/groups/$GROUP_ID/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roleId\": $OPERATOR_ROLE_ID}" | jq
```

### 2. Verify Group Role Inheritance

```bash
# Check that user now has permissions from both individual roles and group roles
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions | length'
```

## Error Testing

### 1. Test Permission Denied Scenarios

```bash
# Try to access admin endpoint as viewer (should fail)
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/rbac/roles | jq

# Try to create object without permission (should fail)
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "vehicle", "lat": 37.7749, "lng": -122.4194}' | jq

# Try to delete other user's object without manage permission (should fail)
curl -s -X DELETE http://localhost:3001/api/objects/1 \
  -H "Authorization: Bearer $OPERATOR_TOKEN" | jq
```

### 2. Test Invalid Token Scenarios

```bash
# Try to access protected endpoint without token (should fail)
curl -s http://localhost:3001/api/objects | jq

# Try to access protected endpoint with invalid token (should fail)
curl -s -H "Authorization: Bearer invalid-token" http://localhost:3001/api/objects | jq
```

## Frontend Testing

### 1. Admin Panel Access

1. **Login as Super Administrator:**
   - Email: `admin@demo.com`
   - Password: `password`
   - Should see shield icon in navbar

2. **Access Admin Panel:**
   - Click shield icon in navbar OR navigate to `/admin`
   - Should see 4 tabs: Users, Roles, Groups, Permissions

### 2. User Management Testing

1. **View Users:**
   - Navigate to Users tab
   - Should see list of all users with roles and creation dates
   - Search functionality should work

2. **Create New User:**
   - Click "Add User" button
   - Fill form: email, password, name (optional), initial role
   - Submit and verify user appears in list

3. **Assign/Remove Roles:**
   - Click edit button on any user
   - Should see current roles and available roles
   - Add new role and verify it appears
   - Remove role and verify it's removed

### 3. Role Management Testing

1. **View Roles:**
   - Navigate to Roles tab
   - Should see grid of role cards with permission counts
   - System roles should have blue shield icon

2. **Create Custom Role:**
   - Click "Create Role" button
   - Fill basic information (name, display name, description)
   - Select permissions by resource group
   - Use "Select All" / "Deselect All" for resource groups
   - Submit and verify role appears in list

3. **View Role Details:**
   - Click "View Permissions" on any role
   - Should see detailed permission breakdown by resource
   - System roles should show as read-only

### 4. Group Management Testing

1. **View Groups:**
   - Navigate to Groups tab
   - Should see grid of group cards with member counts

2. **Create New Group:**
   - Click "Create Group" button
   - Fill form: name, display name, description
   - Submit and verify group appears in list

3. **Manage Group Members:**
   - Click "Manage Members" on any group
   - Should see current members list
   - Add new member from dropdown
   - Remove member and verify removal

### 5. Permission Overview Testing

1. **View Permission Summary:**
   - Navigate to Permissions tab
   - Should see 4 summary cards: Total Permissions, Resources, Active Roles, Avg Usage

2. **Search and Filter:**
   - Use search box to filter permissions
   - Use resource dropdown to filter by resource type
   - Verify filtering works correctly

3. **Permission Usage Analysis:**
   - Each permission should show usage count (how many roles use it)
   - Color-coded badges: Unused (gray), Low usage (yellow), Active (green)
   - Permissions grouped by resource (objects, users, roles, groups, types, icons)

### 6. Permission-Based UI Testing

Test with different user roles to verify UI adapts correctly:

1. **Super Administrator** (`admin@demo.com`):
   - Should see all 4 tabs in admin panel
   - All buttons and actions should be available
   - Can create/edit/delete users, roles, groups

2. **Administrator** (create test user with admin role):
   - Should see all tabs except system admin functions
   - Can manage users, roles, groups
   - Cannot delete system roles

3. **Manager** (create test user with manager role):
   - Should see Users and Groups tabs only
   - Can manage users and groups
   - Cannot access Roles or Permissions tabs

4. **Lower Roles** (Operator, Viewer, User):
   - Should not see admin panel at all
   - Shield icon should not appear in navbar
   - Direct navigation to `/admin` should redirect to dashboard

### 7. Real-time Updates Testing

1. **Multi-tab Testing:**
   - Open admin panel in two browser tabs
   - Create user in one tab
   - Verify user appears in other tab automatically

2. **Role Assignment Updates:**
   - Assign role to user in one tab
   - Verify role appears in user list in other tab

3. **WebSocket Integration:**
   - Verify real-time updates work across all admin components
   - Check browser console for WebSocket connection messages

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Check user's actual permissions
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'
   
   # Verify role assignments
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/users/USER_ID | jq
   ```

2. **Role Assignment Issues**
   ```bash
   # List all roles and their IDs
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq '.[] | {id, name, display_name}'
   
   # Check user's roles
   curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.roles'
   ```

3. **Database Issues**
   ```bash
   # Check RBAC tables
   ./docker-start.sh db
   \dt
   SELECT * FROM roles;
   SELECT * FROM permissions;
   SELECT * FROM user_roles;
   ```

### Reset RBAC System

```bash
# Reset database (⚠️ removes all data)
./docker-start.sh clean
./docker-start.sh dev

# Re-run RBAC migration if needed
docker-compose exec database psql -U tracker_user -d location_tracker -f /path/to/migrate_add_rbac.sql
```

## Automated Testing

### Unit Tests

Run comprehensive unit tests for RBAC components:

```bash
# Run all RBAC unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Watch mode for development
npm run test:unit:watch
```

**Unit Test Coverage:**
- RBACService class methods
- User model authentication
- Permission validation logic
- Role hierarchy validation
- Password security
- Email validation

### API Integration Tests

Test the complete RBAC API functionality:

```bash
# Run API integration tests
npm run test:api

# Run all integration tests
npm run test:integration
```

**API Test Coverage:**
- Authentication endpoints
- Role management APIs
- User management APIs
- Group management APIs
- Permission-based access control
- Object ownership validation
- Error handling scenarios

### UI Integration Tests

Test the RBAC frontend with Playwright:

```bash
# Run UI tests (headless)
npm run test:ui

# Run with browser visible
npm run test:ui:headed

# Debug mode with inspector
npm run test:ui:debug
```

**UI Test Coverage:**
- Admin panel access control
- User management interface
- Role creation and assignment
- Group management
- Permission overview
- Real-time updates
- Error handling
- Accessibility compliance

### Complete Test Suite

```bash
# Run all tests (unit + integration + UI)
npm test

# Setup test environment
npm run test:setup

# Cleanup after testing
npm run test:cleanup
```

## Test Results Validation

After running tests, verify the following results:

### Unit Tests ✅
- **RBACService**: All permission checking logic works correctly
- **User Model**: Authentication and user management functions properly
- **Permission Validation**: All 32 permissions are properly validated
- **Role Hierarchy**: 6 roles have correct permission counts

### API Tests ✅
- **Authentication**: Login/logout and token validation work
- **Permission Enforcement**: API endpoints properly check permissions
- **Object Ownership**: Users can only modify their own objects (unless admin)
- **Role Management**: Admins can create/delete roles, assign permissions
- **User Management**: User creation, role assignment, and management work
- **Group Management**: Group creation and user assignment function correctly

### UI Tests ✅
- **Admin Panel**: Only users with admin permissions can access
- **User Interface**: UI adapts based on user permissions
- **CRUD Operations**: Create, read, update, delete operations work in UI
- **Real-time Updates**: Changes reflect immediately across browser tabs
- **Error Handling**: Graceful error messages for permission denied scenarios
- **Accessibility**: Keyboard navigation and ARIA labels work properly

## Performance Testing

### Load Testing RBAC Endpoints

```bash
# Test role assignment performance
for i in {1..100}; do
  curl -s -X POST http://localhost:3001/api/rbac/users/1/roles \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"roleId": 2}' &
done
wait

# Test permission checking performance
for i in {1..1000}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:3001/api/auth/validate &
done
wait
```

### Database Performance

```bash
# Check RBAC query performance
./docker-start.sh db
\timing on

-- Test permission lookup performance
EXPLAIN ANALYZE SELECT DISTINCT p.name 
FROM permissions p
WHERE p.id IN (
  SELECT rp.permission_id 
  FROM user_roles ur 
  JOIN role_permissions rp ON ur.role_id = rp.role_id 
  WHERE ur.user_id = 1
);

-- Test role hierarchy query performance
EXPLAIN ANALYZE SELECT r.*, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id
ORDER BY permission_count DESC;
```