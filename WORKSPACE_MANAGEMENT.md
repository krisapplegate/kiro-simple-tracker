# Workspace Management

This document describes the workspace (tenant) management functionality in the Location Tracker application.

## Overview

The Location Tracker supports multi-tenant architecture where users can create and access multiple workspaces. Each workspace maintains isolated data, permissions, and RBAC configurations.

## Features

### Workspace Creation
- Any authenticated user can create new workspaces
- Automatic RBAC system initialization for new workspaces
- Creator automatically receives super_admin role in new workspace
- Complete isolation between workspaces

### Multi-Workspace Access
- Users can access multiple workspaces from a single account
- Workspace switching through tenant selector interface
- Different roles and permissions per workspace
- URL-based workspace routing: `/tenant/:tenantId/dashboard`

### RBAC Initialization
When a new workspace is created, the system automatically:
- Creates 6 default system roles (super_admin, admin, manager, operator, viewer, user)
- Assigns 32 granular permissions to appropriate roles
- Creates user record for workspace creator
- Assigns super_admin role to creator

## API Endpoints

### Get User's Workspaces
```http
GET /api/tenants
Authorization: Bearer <token>
```

Returns all workspaces the authenticated user has access to.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Demo Company",
    "created_at": "2025-12-12T09:07:46.453Z",
    "user_role": "admin",
    "roles": []
  },
  {
    "id": 2,
    "name": "My New Workspace",
    "created_at": "2025-12-23T03:14:31.206Z",
    "user_role": "admin",
    "roles": []
  }
]
```

### Create New Workspace
```http
POST /api/tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My New Workspace"
}
```

Creates a new workspace with automatic RBAC initialization.

**Response:**
```json
{
  "id": 2,
  "name": "My New Workspace",
  "created_at": "2025-12-23T03:14:31.206Z",
  "updated_at": "2025-12-23T03:14:31.206Z"
}
```

### Get Workspace Details
```http
GET /api/tenants/:tenantId
Authorization: Bearer <token>
```

Returns detailed information about a specific workspace.

### Get User Info for Workspace
```http
GET /api/tenants/:tenantId/user
Authorization: Bearer <token>
```

Returns user's role and permissions for a specific workspace.

## Frontend Components

### TenantSelectorPage
- Displays all accessible workspaces
- "Create New Workspace" card with modal
- Workspace selection and navigation
- Role display for each workspace

### TenantTabs
- In-app workspace switching
- Displays current workspace name
- Dropdown for workspace selection
- Fixed z-index issues for proper display over map

### TenantContext
- React context for workspace state management
- Current tenant ID and information
- Workspace switching functionality

## Database Schema

### Multi-Tenant User Model
Users can exist in multiple tenants with different roles:

```sql
-- Users table allows same email across different tenants
ALTER TABLE users DROP CONSTRAINT users_email_key;
ALTER TABLE users ADD CONSTRAINT users_email_tenant_unique UNIQUE (email, tenant_id);
```

### RBAC System Per Tenant
Each workspace gets its own complete RBAC system:
- Roles are tenant-specific
- Permissions are global but assigned per tenant
- User roles are scoped to specific tenants

## Implementation Details

### RBACService.initializeTenantRBAC()
Automatically creates default roles and permissions for new workspaces:

```javascript
static async initializeTenantRBAC(tenantId) {
  // Creates 6 default roles
  const defaultRoles = [
    { name: 'super_admin', displayName: 'Super Administrator', ... },
    { name: 'admin', displayName: 'Administrator', ... },
    { name: 'manager', displayName: 'Manager', ... },
    { name: 'operator', displayName: 'Operator', ... },
    { name: 'viewer', displayName: 'Viewer', ... },
    { name: 'user', displayName: 'Standard User', ... }
  ]
  
  // Assigns appropriate permissions to each role
  // Returns created roles for further use
}
```

### User.getUserTenants()
Retrieves all workspaces a user has access to:

```javascript
static async getUserTenants(userId) {
  // Gets user email from ID
  // Queries all tenants where user exists by email
  // Returns tenant info with user's role in each
}
```

### WebSocket Tenant Isolation
WebSocket connections are tenant-specific:
- Clients join specific tenant channels
- Broadcasts are filtered by tenant ID
- Real-time updates only sent to relevant workspace users

## Usage Examples

### Creating a Workspace via UI
1. Navigate to tenant selector page
2. Click "Create New Workspace" card
3. Enter workspace name in modal
4. Click "Create Workspace"
5. Automatically redirected to new workspace dashboard

### Creating a Workspace via API
```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Create new workspace
curl -X POST http://localhost:3001/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"My API Workspace"}'
```

### Switching Workspaces
1. Use tenant tabs at top of dashboard
2. Click dropdown to see all accessible workspaces
3. Select different workspace
4. URL updates to `/tenant/:newTenantId/dashboard`
5. Context switches to new workspace

## Security Considerations

### Workspace Isolation
- Complete data isolation between workspaces
- Users cannot access data from workspaces they don't belong to
- API endpoints verify tenant access before returning data

### Permission Inheritance
- Users maintain separate roles per workspace
- No permission inheritance between workspaces
- Each workspace has independent RBAC configuration

### Creator Privileges
- Workspace creators automatically get super_admin role
- Can manage all aspects of their workspace
- Can invite other users and assign roles

## Testing

### Unit Tests
```bash
# Test RBAC initialization
npm test -- --grep "initializeTenantRBAC"

# Test multi-tenant user access
npm test -- --grep "getUserTenants"
```

### Integration Tests
```bash
# Test workspace creation API
npm run test:api -- --grep "tenant creation"

# Test workspace access control
npm run test:api -- --grep "tenant access"
```

### Manual Testing
1. Create multiple workspaces with different names
2. Verify RBAC roles are created for each workspace
3. Test workspace switching functionality
4. Verify data isolation between workspaces
5. Test user permissions in different workspaces

## Troubleshooting

### Common Issues

**Workspace not appearing in list:**
- Check if user exists in that tenant's users table
- Verify getUserTenants query is working correctly
- Check for database constraint violations

**RBAC not initialized:**
- Verify initializeTenantRBAC function completed successfully
- Check backend logs for initialization errors
- Manually verify roles table has entries for new tenant

**Permission denied errors:**
- Ensure user has correct role in target workspace
- Check tenant ID in JWT token matches requested workspace
- Verify RBAC middleware is working correctly

**WebSocket not connecting to workspace:**
- Check if client sent join_tenant message
- Verify tenantId is stored on WebSocket connection
- Check backend logs for WebSocket tenant joining

### Debug Commands
```bash
# Check user's workspaces
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/tenants

# Verify RBAC roles for workspace
docker exec -it simple-tracker-database-1 psql -U tracker_user -d location_tracker \
  -c "SELECT name, display_name FROM roles WHERE tenant_id = 2;"

# Check user exists in workspace
docker exec -it simple-tracker-database-1 psql -U tracker_user -d location_tracker \
  -c "SELECT email, role FROM users WHERE tenant_id = 2;"
```

## Future Enhancements

- Workspace templates with pre-configured roles
- Workspace invitation system
- Workspace transfer between users
- Workspace archiving and deletion
- Workspace usage analytics
- Bulk user import for workspaces