# Development Guide

Development workflows, architecture details, and advanced configuration for Location Tracker.

## 🏗️ Architecture

### System Design
- **Multi-tenant SaaS** with complete workspace isolation
- **RESTful API** with JWT authentication and RBAC
- **Real-time updates** via WebSocket connections
- **Microservices pattern** with modular backend services

### Tech Stack
- **Frontend**: React 18, Vite, TanStack Query, Leaflet, TailwindCSS
- **Backend**: Node.js/Express, PostgreSQL, JWT, WebSocket, MinIO
- **Testing**: Vitest, Playwright, Supertest (118+ tests)
- **Infrastructure**: Docker, Docker Compose

### Database Schema
```sql
-- Multi-tenant core
tenants (id, name, created_at)
users (id, email, password_hash, role, tenant_id)
objects (id, name, type, lat, lng, tenant_id, created_by)
location_history (id, object_id, lat, lng, timestamp, tenant_id)
images (id, object_name, file_name, image_url, tenant_id)

-- RBAC system  
roles (id, name, display_name, tenant_id)
permissions (id, name, resource, action)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id)
groups (id, name, tenant_id)
```

## 🔧 Development Setup

### Environment Configuration
```bash
# .env file
JWT_SECRET=dev-secret-key
NODE_ENV=development
DB_HOST=localhost
DB_PASSWORD=tracker_password
MINIO_ENDPOINT=minio
MINIO_ACCESS_KEY=minioadmin
VITE_API_URL=http://localhost:3001
```

### Development Workflow

#### Docker (Recommended)
```bash
./docker-start.sh dev     # Start full stack
./docker-start.sh logs    # View logs
./docker-start.sh db      # Database shell
./docker-start.sh health  # Check status
```

#### Manual Development
```bash
# Terminal 1: Database + MinIO
docker-compose up database minio

# Terminal 2: Backend (with hot reload)
npm run dev:backend

# Terminal 3: Frontend (with HMR)
npm run dev:frontend
```

## 📁 Project Structure

```
location-tracker/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── MapView.jsx          # Main map interface
│   │   ├── Sidebar.jsx          # Filters and controls
│   │   ├── ObjectDrawer.jsx     # Object details
│   │   └── admin/               # Admin components
│   │       ├── UserManagement.jsx
│   │       ├── RoleManagement.jsx
│   │       └── WorkspaceManagement.jsx
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.jsx     # Authentication
│   │   └── TenantContext.jsx   # Multi-tenant state
│   ├── pages/                   # Page components
│   └── hooks/                   # Custom hooks
├── backend/                     # Node.js backend
│   ├── server.js               # Express server + routes
│   ├── models/                 # Database models
│   ├── services/               # Business logic
│   │   ├── RBACService.js      # Role-based access
│   │   └── MinioService.js     # Object storage
│   └── middleware/             # Express middleware
├── database/                   # Database management
│   ├── init.sql               # Schema initialization
│   ├── manage.js              # CLI management
│   └── migrate_*.sql          # Database migrations
├── simulator/                  # Location simulator
│   ├── src/simulator.js       # Main logic
│   ├── src/ImageGenerator.js  # Camera images
│   └── run-simulator.sh       # Management script
└── tests/                     # Test suites (118+ tests)
```

## 🔐 RBAC Architecture

### Permission Model
```javascript
// 32 permissions across 6 resources
const PERMISSIONS = {
  objects: ['read', 'create', 'update', 'delete', 'manage'],
  users: ['read', 'create', 'update', 'delete', 'manage'], 
  roles: ['read', 'create', 'update', 'delete', 'manage'],
  groups: ['read', 'create', 'update', 'delete', 'manage'],
  types: ['read', 'create', 'update', 'delete', 'manage'],
  icons: ['read', 'create', 'update', 'delete', 'manage'],
  system: ['admin', 'audit']
}
```

### Permission Middleware
```javascript
const requirePermission = (permission) => {
  return async (req, res, next) => {
    const hasPermission = await RBACService.hasPermission(
      req.user.effectiveUserId,
      permission,
      req.user.effectiveTenantId
    )
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied' })
    }
    next()
  }
}
```

## 🌐 Multi-Tenant Architecture

### Tenant Isolation
- **Database**: All tables include `tenant_id` with foreign key constraints
- **API**: Middleware filters queries by tenant automatically
- **Frontend**: Context provides tenant-aware API calls
- **WebSocket**: Connections scoped to specific tenants

### Tenant Switching
```javascript
// Frontend: Tenant-aware headers
const getApiHeaders = () => ({
  'Authorization': `Bearer ${token}`,
  'X-Tenant-Id': tenantId,
  'Content-Type': 'application/json'
})

// Backend: Tenant access verification
const headerTenantId = req.headers['x-tenant-id']
const userTenants = await User.getUserTenants(user.id)
const hasAccess = userTenants.some(t => t.id === headerTenantId)
```

## 📸 Camera Image System

### Image Generation
```javascript
// Canvas-based realistic images
class ImageGenerator {
  generateCameraImage(lat, lng, timestamp, objectType) {
    const canvas = createCanvas(640, 480)
    const ctx = canvas.getContext('2d')
    
    // Time-based lighting
    const hour = new Date(timestamp).getHours()
    const isDay = hour >= 6 && hour < 18
    
    // Location-based scenes
    const isUrban = this.isUrbanArea(lat, lng)
    
    this.drawBackground(ctx, isDay)
    this.drawEnvironment(ctx, isUrban)
    this.addCameraOverlay(ctx, lat, lng, timestamp)
    
    return canvas.toBuffer('image/jpeg')
  }
}
```

### MinIO Integration
```javascript
// Object storage service
class MinioService {
  async uploadImage(buffer, fileName, contentType) {
    const objectName = `images/${Date.now()}-${fileName}`
    
    await this.client.putObject(
      this.bucketName,
      objectName,
      buffer,
      buffer.length,
      { 'Content-Type': contentType }
    )
    
    return {
      success: true,
      imageUrl: this.getPublicUrl(objectName),
      objectName
    }
  }
}
```

## 🔄 Real-Time Updates

### WebSocket Implementation
```javascript
// Backend: Tenant-scoped broadcasting
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message)
    if (data.type === 'join_tenant') {
      ws.tenantId = data.tenantId
    }
  })
})

// Broadcast to tenant clients only
const broadcastToTenant = (tenantId, data) => {
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.tenantId === tenantId) {
      client.send(JSON.stringify(data))
    }
  })
}
```

### Frontend WebSocket Hook
```javascript
const useWebSocket = (tenantId) => {
  const [socket, setSocket] = useState(null)
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join_tenant', tenantId }))
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Handle real-time updates
      if (data.type === 'object_created') {
        queryClient.invalidateQueries(['objects', tenantId])
      }
    }
    
    setSocket(ws)
    return () => ws.close()
  }, [tenantId])
  
  return socket
}
```

## 🗄️ Database Management

### Connection Pooling
```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const query = (text, params) => pool.query(text, params)
```

### Migration System
```bash
# Apply migrations
docker cp database/migrate_add_images.sql container:/tmp/
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_images.sql

# CLI management
node database/manage.js stats
node database/manage.js createUser user@example.com password123 user 1
```

## 🧪 Testing Architecture

### Test Structure (118+ tests)
```
tests/
├── unit/ (63 tests)
│   ├── rbac.test.js        # RBAC service
│   ├── user.test.js        # User model
│   └── auth-middleware.test.js
├── integration/ (25 tests)
│   ├── rbac-api.test.js    # API endpoints
│   ├── workspace-creation.test.js
│   └── tenant-isolation.test.js
└── ui/ (30+ tests)
    └── rbac-ui.test.js     # Playwright UI tests
```

### Test Configuration
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
})

// playwright.config.js
export default defineConfig({
  testDir: './tests/integration',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  }
})
```

## 🚗 Simulator Architecture

### Movement Patterns
```javascript
class LocationSimulator {
  generateNextPosition() {
    switch (this.config.pattern) {
      case 'random': return this.generateRandomMovement()
      case 'circle': return this.generateCircularMovement()  
      case 'square': return this.generateSquareMovement()
      case 'street': return this.generateStreetMovement()
    }
  }
  
  async updateLocation() {
    const newPosition = this.generateNextPosition()
    
    // Update via API
    await axios.put(`${this.apiUrl}/api/objects/${this.objectId}/location`, 
      newPosition, { headers: this.getHeaders() })
    
    // Upload image if enabled
    if (this.config.includeImages && this.shouldUploadImage()) {
      await this.uploadCameraImage()
    }
  }
}
```

## 🚀 Build & Deployment

### Development
```bash
npm run dev:frontend  # Vite dev server (port 3000)
npm run dev:backend   # Nodemon server (port 3001)
npm run dev           # Both servers
```

### Production
```bash
npm run build         # Build frontend
./docker-start.sh prod # Production containers
```

### Docker Configuration
```yaml
# docker-compose.yml
services:
  frontend:
    build:
      dockerfile: Dockerfile.frontend
    ports: ["3000:3000"]
    environment:
      - VITE_API_URL=http://localhost:3001

  backend:
    build:
      dockerfile: Dockerfile.backend
    ports: ["3001:3001"]
    environment:
      - NODE_ENV=development
      - JWT_SECRET=dev-secret
    depends_on: [database, minio]

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=location_tracker
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"
```

## 🔧 Performance Optimization

### Backend
```javascript
// Query optimization with indexes
CREATE INDEX idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX idx_location_history_object_id ON location_history(object_id);
CREATE INDEX idx_images_tenant_id ON images(tenant_id);

// Connection pooling
const pool = new Pool({ max: 20, idleTimeoutMillis: 30000 })
```

### Frontend
```javascript
// Code splitting
const AdminPage = lazy(() => import('./pages/AdminPage'))

// Query optimization
const useObjects = (tenantId, filters) => {
  return useQuery({
    queryKey: ['objects', tenantId, filters],
    queryFn: () => fetchObjects(tenantId, filters),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000  // 10 minutes
  })
}
```

## 🐛 Debugging

### Backend
```bash
DEBUG=app:* npm run dev:backend     # Debug logging
DB_DEBUG=true npm run dev:backend   # Query logging
node --inspect backend/server.js    # Node inspector
```

### Frontend
```bash
npm run dev:frontend -- --debug     # Vite debug
VITE_SOURCE_MAP=true npm run build  # Source maps
```

### Database
```sql
-- Performance analysis
EXPLAIN ANALYZE SELECT * FROM objects WHERE tenant_id = 1;

-- Active connections
SELECT * FROM pg_stat_activity;

-- Index usage
SELECT schemaname, tablename, attname, n_distinct 
FROM pg_stats WHERE tablename = 'objects';
```

This guide provides comprehensive information for developing and extending the Location Tracker application.