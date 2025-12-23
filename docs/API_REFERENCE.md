# API Reference

Complete REST API documentation for Location Tracker.

## 🔐 Authentication

All API endpoints require JWT authentication unless otherwise specified.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "admin",
    "tenant": {
      "id": 1,
      "name": "Default Workspace"
    }
  }
}
```

### Validate Token
```http
GET /api/auth/validate
Authorization: Bearer {token}
```

**Response:**
```json
{
  "valid": true,
  "user": { ... },
  "permissions": ["objects.read", "objects.create", ...]
}
```

## 📍 Objects API

### List Objects
```http
GET /api/objects
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Query Parameters:**
- `type` - Filter by object type
- `tags` - Filter by tags (comma-separated)
- `startTime` - ISO timestamp for time range
- `endTime` - ISO timestamp for time range

**Response:**
```json
[
  {
    "id": 1,
    "name": "NYC Taxi #123",
    "type": "taxi",
    "lat": 40.7128,
    "lng": -74.0060,
    "lastUpdate": "2023-12-23T10:30:00Z",
    "description": "Yellow taxi in Manhattan",
    "tags": ["vehicle", "commercial"],
    "createdBy": "user@example.com"
  }
]
```

### Create Object
```http
POST /api/objects
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "name": "New Object",
  "type": "vehicle",
  "lat": 40.7128,
  "lng": -74.0060,
  "description": "Optional description",
  "tags": ["tag1", "tag2"]
}
```

**Required Permission:** `objects.create`

### Update Object Location
```http
PUT /api/objects/{id}/location
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "lat": 40.7589,
  "lng": -73.9851
}
```

**Required Permission:** `objects.update`

**Response:**
```json
{
  "message": "Location updated successfully",
  "lat": 40.7589,
  "lng": -73.9851,
  "timestamp": "2023-12-23T10:35:00Z"
}
```

### Get Object Details
```http
GET /api/objects/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Update Object
```http
PUT /api/objects/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "tags": ["new", "tags"]
}
```

**Required Permission:** `objects.update`

### Delete Object
```http
DELETE /api/objects/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Required Permission:** `objects.delete`

### Get Objects with Location History
```http
GET /api/objects/with-history
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "NYC Taxi #123",
    "type": "taxi",
    "currentLat": 40.7128,
    "currentLng": -74.0060,
    "locationHistory": [
      {
        "lat": 40.7100,
        "lng": -74.0050,
        "timestamp": "2023-12-23T10:25:00Z"
      },
      {
        "lat": 40.7128,
        "lng": -74.0060,
        "timestamp": "2023-12-23T10:30:00Z"
      }
    ]
  }
]
```

## 📸 Images API

### Upload Image
```http
POST /api/objects/{id}/images
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: multipart/form-data

image: {file}
```

**Required Permission:** `objects.update`

**Response:**
```json
{
  "id": 123,
  "imageUrl": "http://localhost:9000/location-images/1703332200000-camera-image.jpg",
  "fileName": "1703332200000-camera-image.jpg",
  "contentType": "image/jpeg",
  "createdAt": "2023-12-23T10:30:00Z"
}
```

### Get Object Images
```http
GET /api/objects/{id}/images
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Query Parameters:**
- `startTime` - Filter images from this time
- `endTime` - Filter images until this time
- `limit` - Maximum number of images (default: 50)

### Get Recent Images
```http
GET /api/images/recent
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Query Parameters:**
- `limit` - Maximum number of images (default: 10)

## 🔧 Object Type Configuration

### Get Type Configurations
```http
GET /api/object-type-configs
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Response:**
```json
{
  "taxi": {
    "emoji": "🚕",
    "color": "#eab308"
  },
  "drone": {
    "emoji": "🚁",
    "color": "#8b5cf6"
  }
}
```

### Create/Update Type Configuration
```http
POST /api/object-type-configs
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "typeName": "vehicle",
  "emoji": "🚗",
  "color": "#3b82f6"
}
```

**Required Permission:** `types.create`

### Delete Type Configuration
```http
DELETE /api/object-type-configs/{typeName}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Required Permission:** `types.delete`

## 👥 User Management

### List Users
```http
GET /api/users
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Required Permission:** `users.read`

### Create User
```http
POST /api/users
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"
}
```

**Required Permission:** `users.create`

### Update User
```http
PUT /api/users/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "email": "updated@example.com",
  "role": "operator"
}
```

**Required Permission:** `users.update`

### Delete User
```http
DELETE /api/users/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Required Permission:** `users.delete`

## 🔐 RBAC Management

### List Roles
```http
GET /api/rbac/roles
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### Create Role
```http
POST /api/rbac/roles
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
Content-Type: application/json

{
  "name": "custom_role",
  "displayName": "Custom Role",
  "permissions": ["objects.read", "objects.create"]
}
```

**Required Permission:** `roles.create`

### Get User RBAC Info
```http
GET /api/rbac/users/{id}
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  },
  "roles": ["admin", "manager"],
  "permissions": ["objects.read", "objects.create", ...],
  "groups": ["administrators"]
}
```

## 🏢 Admin API (Super Admin Only)

### List All Tenants
```http
GET /api/admin/tenants
Authorization: Bearer {token}
```

**Required Permission:** `system.admin`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Default Workspace",
    "createdAt": "2023-01-01T00:00:00Z",
    "stats": {
      "user_count": 5,
      "object_count": 10,
      "location_history_count": 1000
    }
  }
]
```

### Delete Tenant (Cascading)
```http
DELETE /api/admin/tenants/{id}
Authorization: Bearer {token}
```

**Required Permission:** `system.admin`

**Note:** Deletes ALL associated data (users, objects, location history, images)

### List All Objects (Cross-Tenant)
```http
GET /api/admin/objects
Authorization: Bearer {token}
```

**Required Permission:** `system.admin`

### Delete Object (Cross-Tenant)
```http
DELETE /api/admin/objects/{id}
Authorization: Bearer {token}
```

**Required Permission:** `system.admin`

## 🔍 System Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2023-12-23T10:30:00Z",
  "database": "connected"
}
```

### System Statistics
```http
GET /api/stats
Authorization: Bearer {token}
```

**Required Permission:** `system.admin`

## 📡 WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:3001')

// Join tenant channel
ws.send(JSON.stringify({
  type: 'join_tenant',
  tenantId: 1
}))
```

### Real-Time Events
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  switch (data.type) {
    case 'object_created':
      // New object created
      break
    case 'object_updated':
      // Object location/details updated
      break
    case 'object_deleted':
      // Object deleted
      break
    case 'image_uploaded':
      // New image uploaded
      break
  }
}
```

## 🚫 Error Responses

### Standard Error Format
```json
{
  "error": true,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Permission Errors
```json
{
  "error": true,
  "message": "Permission denied",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": "objects.create",
    "user_permissions": ["objects.read"]
  }
}
```

## 📝 Request Headers

### Required Headers
```http
Authorization: Bearer {jwt_token}
X-Tenant-Id: {tenant_id}
Content-Type: application/json
```

### Optional Headers
```http
X-Request-ID: {unique_request_id}
User-Agent: LocationTracker/1.0
```

## 🔄 Rate Limiting

- **Standard Endpoints**: 100 requests per minute per user
- **Image Upload**: 10 uploads per minute per user
- **Authentication**: 5 attempts per minute per IP
- **Admin Endpoints**: 50 requests per minute per admin

## 📊 Pagination

For endpoints returning lists, use these parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `sort` - Sort field (default: id)
- `order` - Sort order: asc/desc (default: asc)

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

---

**Related Documentation**:
- [User Guide](USER_GUIDE.md) - End-user features
- [Admin Guide](ADMIN_GUIDE.md) - Administrative features
- [Setup Guide](SETUP.md) - Installation and configuration