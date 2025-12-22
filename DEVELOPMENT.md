# Development Guide

This guide covers development workflows, architecture details, and advanced configuration for the Location Tracker application.

## 🏗️ Architecture Overview

### System Design
- **Multi-tenant SaaS architecture** with complete workspace isolation
- **Microservices pattern** with modular backend services
- **RESTful API** with JWT authentication and RBAC
- **Real-time updates** via WebSocket connections
- **Responsive frontend** with React and modern tooling

### Tech Stack

#### Frontend
- **React 18** with Hooks and Context API
- **Vite** for fast development and building
- **TanStack Query** for data fetching and caching
- **React Router** for client-side routing
- **Leaflet & React-Leaflet** for interactive maps
- **Tailwind CSS** for styling
- **Lucide React** for icons

#### Backend
- **Node.js** with Express framework
- **PostgreSQL 15** with PostGIS for spatial data
- **JWT** authentication with bcrypt password hashing
- **WebSocket** for real-time updates
- **Docker** for containerization

#### Database Schema
```sql
-- Core entities with tenant isolation
tenants (id, name, created_at)
users (id, email, password_hash, role, tenant_id)
objects (id, name, type, lat, lng, tenant_id, created_by)
location_history (id, object_id, lat, lng, timestamp, tenant_id)

-- RBAC system
roles (id, name, display_name, tenant_id)
permissions (id, name, resource, action)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id)
groups (id, name, tenant_id)
user_groups (user_id, group_id)
```

## 🔧 Development Setup

### Environment Configuration

Create `.env` file:
```bash
# Backend Configuration
JWT_SECRET=your-development-secret-key
NODE_ENV=development
PORT=3001

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=location_tracker
DB_USER=tracker_user
DB_PASSWORD=tracker_password

# Frontend Configuration
VITE_API_URL=http://localhost:3001
```

### Development Workflow

#### Using Docker (Recommended)
```bash
# Start development environment
./docker-start.sh dev

# View logs
./docker-start.sh logs

# Access database
./docker-start.sh db

# Run tests
./docker-start.sh test-unit
```

#### Manual Development
```bash
# Terminal 1: Database
docker-compose up database

# Terminal 2: Backend
npm run dev:backend

# Terminal 3: Frontend
npm run dev:frontend
```

### Hot Reload Development
- **Frontend**: Vite provides instant hot module replacement
- **Backend**: Nodemon automatically restarts on file changes
- **Database**: Persistent volumes maintain data across restarts

## 🏛️ Project Structure

```
location-tracker/
├── src/                          # Frontend React application
│   ├── components/               # Reusable React components
│   │   ├── MapView.jsx          # Main map interface
│   │   ├── Sidebar.jsx          # Filters and controls
│   │   ├── ObjectDrawer.jsx     # Object details panel
│   │   ├── CreateObjectModal.jsx # Object creation modal
│   │   ├── Navbar.jsx           # Navigation bar
│   │   └── admin/               # RBAC admin components
│   │       ├── UserManagement.jsx
│   │       ├── RoleManagement.jsx
│   │       ├── GroupManagement.jsx
│   │       └── PermissionOverview.jsx
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.jsx     # Authentication state
│   │   └── TenantContext.jsx   # Multi-tenant state
│   ├── pages/                   # Page components
│   │   ├── LoginPage.jsx       # Authentication
│   │   ├── DashboardPage.jsx   # Main dashboard
│   │   ├── TenantSelectorPage.jsx # Workspace selection
│   │   └── AdminPage.jsx       # RBAC administration
│   ├── hooks/                   # Custom React hooks
│   │   └── useWebSocket.js     # WebSocket connection
│   └── utils/                   # Utility functions
├── backend/                     # Node.js backend
│   ├── server.js               # Express server and routes
│   ├── database.js             # PostgreSQL connection
│   ├── models/                 # Database models
│   │   ├── User.js            # User authentication
│   │   ├── Tenant.js          # Multi-tenant management
│   │   ├── TrackedObject.js   # Object tracking
│   │   └── LocationHistory.js # Location history
│   ├── services/              # Business logic
│   │   └── RBACService.js     # Role-based access control
│   └── middleware/            # Express middleware
│       └── rbac.js           # RBAC permission checking
├── database/                   # Database management
│   ├── init.sql              # Schema initialization
│   ├── manage.js             # CLI management tool
│   └── migrations/           # Database migrations
├── tests/                     # Test suites
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── vitest.config.js      # Vitest configuration
│   └── playwright.config.js  # Playwright configuration
├── docker-compose.yml         # Development Docker setup
├── docker-compose.prod.yml    # Production Docker setup
└── docker-start.sh           # Docker management script
```

## 🔐 RBAC System Architecture

### Permission Model
The RBAC system uses a hierarchical permission model:

```javascript
// 32 granular permissions across 6 resources
const PERMISSIONS = {
  objects: ['read', 'create', 'update', 'delete', 'manage'],
  users: ['read', 'create', 'update', 'delete', 'manage'],
  roles: ['read', 'create', 'update', 'delete', 'manage'],
  groups: ['read', 'create', 'update', 'delete', 'manage'],
  types: ['read', 'create', 'update', 'delete', 'manage'],
  icons: ['read', 'create', 'update', 'delete', 'manage'],
  system: ['admin']
}
```

### Role Hierarchy
```javascript
// 6 default roles with different permission levels
const DEFAULT_ROLES = [
  { name: 'super_admin', permissions: 32 }, // Full system access
  { name: 'admin', permissions: 31 },       // Full management
  { name: 'manager', permissions: 16 },     // Team oversight
  { name: 'operator', permissions: 12 },    // Object management
  { name: 'viewer', permissions: 7 },       // Read-only access
  { name: 'user', permissions: 6 }          // Basic access
]
```

### Permission Checking
```javascript
// Backend permission middleware
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
Complete data isolation is achieved through:

1. **Database Level**: All tables include `tenant_id` column
2. **API Level**: Middleware filters all queries by tenant
3. **Frontend Level**: Context provides tenant-aware API calls
4. **WebSocket Level**: Connections are scoped to specific tenants

### Tenant Switching
```javascript
// Frontend: TenantContext provides tenant-aware headers
const getApiHeaders = () => ({
  'Authorization': `Bearer ${token}`,
  'X-Tenant-Id': tenantId,
  'Content-Type': 'application/json'
})

// Backend: Authentication middleware handles tenant switching
const headerTenantId = req.headers['x-tenant-id'] ? 
  parseInt(req.headers['x-tenant-id']) : null

// Verify user has access to requested tenant
const userTenants = await User.getUserTenants(user.id)
const hasAccess = userTenants.some(t => t.id === requestedTenantId)
```

## 🔄 Real-Time Updates

### WebSocket Implementation
```javascript
// Backend: Tenant-specific WebSocket connections
wss.on('connection', (ws) => {
  ws.tenantId = null
  
  ws.on('message', (message) => {
    const data = JSON.parse(message)
    
    if (data.type === 'join_tenant') {
      ws.tenantId = data.tenantId
      ws.send(JSON.stringify({ 
        type: 'tenant_joined', 
        tenantId: data.tenantId 
      }))
    }
  })
})

// Broadcast only to relevant tenant clients
wss.clients.forEach(client => {
  if (client.readyState === 1 && client.tenantId === tenantId) {
    client.send(JSON.stringify({
      type: 'object_created',
      tenantId: tenantId,
      data: newObject
    }))
  }
})
```

### Frontend WebSocket Hook
```javascript
// Custom hook for WebSocket connection
const useWebSocket = (tenantId) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001')
    
    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ 
        type: 'join_tenant', 
        tenantId 
      }))
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Handle real-time updates
    }
    
    setSocket(ws)
    return () => ws.close()
  }, [tenantId])
  
  return { socket, connected }
}
```

## 🗄️ Database Management

### Connection Pooling
```javascript
// database.js - PostgreSQL connection with pooling
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'location_tracker',
  user: process.env.DB_USER || 'tracker_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const query = (text, params) => pool.query(text, params)
```

### Migration System
```javascript
// Database migrations for schema updates
const migrations = [
  'migrate_add_created_by.sql',
  'migrate_add_object_type_configs.sql', 
  'migrate_add_rbac.sql'
]

// Run migrations
migrations.forEach(migration => {
  execSync(`psql -h localhost -U tracker_user -d location_tracker -f database/${migration}`)
})
```

### CLI Management Tool
```bash
# database/manage.js - Database management CLI
node database/manage.js stats           # Show statistics
node database/manage.js listUsers       # List users
node database/manage.js createUser      # Create user
node database/manage.js listObjects     # List objects
node database/manage.js createTenant    # Create tenant
```

## 🎨 Frontend Architecture

### State Management
```javascript
// AuthContext - Global authentication state
const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Authentication logic
  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    const data = await response.json()
    if (response.ok) {
      localStorage.setItem('token', data.token)
      setUser(data.user)
    }
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Data Fetching with TanStack Query
```javascript
// Custom hooks for data fetching
const useObjects = (tenantId) => {
  const { getApiHeaders } = useTenant()
  
  return useQuery({
    queryKey: ['objects', tenantId],
    queryFn: async () => {
      const response = await fetch('/api/objects', {
        headers: getApiHeaders()
      })
      return response.json()
    },
    enabled: !!tenantId
  })
}
```

### Component Architecture
```javascript
// MapView.jsx - Main map component
const MapView = () => {
  const { tenantId } = useTenant()
  const { data: objects } = useObjects(tenantId)
  const { socket } = useWebSocket(tenantId)
  
  // Real-time updates
  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'object_created') {
          queryClient.invalidateQueries(['objects', tenantId])
        }
      }
    }
  }, [socket, tenantId])
  
  return (
    <MapContainer>
      {objects?.map(object => (
        <Marker key={object.id} position={[object.lat, object.lng]}>
          <Popup>
            <ObjectTooltip object={object} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

## 🧪 Testing Architecture

### Test Structure
```
tests/
├── unit/                    # Unit tests (63 tests)
│   ├── rbac.test.js        # RBAC service tests
│   ├── rbac-service.test.js # RBAC service unit tests
│   ├── auth-middleware.test.js # Auth middleware tests
│   └── user.test.js        # User model tests
├── integration/            # Integration tests (25 tests)
│   ├── rbac-api.test.js    # RBAC API tests
│   ├── workspace-creation.test.js # Workspace tests
│   ├── tenant-isolation.test.js # Tenant isolation tests
│   └── rbac-ui.test.js     # UI tests (Playwright)
├── setup.js               # Global test setup
├── vitest.config.js       # Vitest configuration
└── playwright.config.js   # Playwright configuration
```

### Test Configuration
```javascript
// vitest.config.js - Unit test configuration
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
})

// playwright.config.js - UI test configuration
export default defineConfig({
  testDir: './tests/integration',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
})
```

## 🚀 Build and Deployment

### Development Build
```bash
# Frontend development server
npm run dev:frontend  # Vite dev server on port 3000

# Backend development server  
npm run dev:backend   # Nodemon on port 3001

# Full development stack
npm run dev           # Both frontend and backend
```

### Production Build
```bash
# Build frontend for production
npm run build         # Creates dist/ folder

# Production Docker build
./docker-start.sh prod # Builds and runs production containers
```

### Docker Configuration
```yaml
# docker-compose.yml - Development
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - JWT_SECRET=dev-secret
    depends_on:
      - database

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=location_tracker
      - POSTGRES_USER=tracker_user
      - POSTGRES_PASSWORD=tracker_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

## 🔧 Advanced Configuration

### Environment-Specific Settings

#### Development
```bash
NODE_ENV=development
DEBUG=app:*
DB_DEBUG=true
VITE_API_URL=http://localhost:3001
```

#### Production
```bash
NODE_ENV=production
JWT_SECRET=secure-production-secret
DB_SSL=true
VITE_API_URL=https://api.yourdomain.com
```

### Performance Optimization

#### Backend Optimization
```javascript
// Connection pooling
const pool = new Pool({
  max: 20,                    # Maximum connections
  idleTimeoutMillis: 30000,   # Close idle connections
  connectionTimeoutMillis: 2000 # Connection timeout
})

// Query optimization
const getObjectsQuery = `
  SELECT o.*, u.email as creator_email
  FROM objects o
  JOIN users u ON o.created_by = u.id
  WHERE o.tenant_id = $1
  ORDER BY o.created_at DESC
  LIMIT $2 OFFSET $3
`
```

#### Frontend Optimization
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

### Backend Debugging
```bash
# Enable debug logging
DEBUG=app:* npm run dev:backend

# Database query logging
DB_DEBUG=true npm run dev:backend

# Node.js inspector
node --inspect backend/server.js
```

### Frontend Debugging
```bash
# React Developer Tools
# Install browser extension

# Vite debugging
npm run dev:frontend -- --debug

# Source maps in production
VITE_SOURCE_MAP=true npm run build
```

### Database Debugging
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Query performance
EXPLAIN ANALYZE SELECT * FROM objects WHERE tenant_id = 1;

-- Index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats WHERE tablename = 'objects';
```

This development guide provides comprehensive information for working with the Location Tracker codebase, from architecture understanding to advanced debugging techniques.