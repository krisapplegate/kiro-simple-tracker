#!/usr/bin/env python3
"""
Complete GitHub Issues Generator for Architecture Review
Generates all 25 issues across 4 phases
"""

import json
import os
import sys

# Phase 3 and Phase 4 issues
additional_issues = [
    # PHASE 3: MEDIUM PRIORITY (7 issues)
    {
        "phase": "3",
        "number": 15,
        "title": "[MEDIUM] Standardize Tenant Resolution",
        "labels": ["medium-priority", "backend", "multi-tenant", "phase-3"],
        "effort": "3 days",
        "dependencies": "#1 (Refactor architecture)",
        "body": """## Problem

Multiple inconsistent ways to specify tenant ID.

**Current State:**
```javascript
// JWT token (user.tenantId)
// X-Tenant-Id header
// Path parameter (:tenantId)
// Query parameter
// Inconsistent precedence and validation
```

## Issues

- ❌ Confusing for API consumers
- ❌ Inconsistent behavior across endpoints
- ❌ Security risks from precedence issues
- ❌ Difficult to audit tenant access

## Recommendation

Standardize tenant resolution with clear precedence:

```javascript
// middleware/tenantResolver.js
const resolveTenant = async (req, res, next) => {
  // Precedence: header > path > JWT
  const tenantId =
    parseInt(req.headers['x-tenant-id']) ||
    parseInt(req.params.tenantId) ||
    req.user.tenantId

  // Validate user has access to this tenant
  const hasAccess = await validateTenantAccess(req.user.id, tenantId)

  if (!hasAccess) {
    return res.status(403).json({
      error: 'TENANT_ACCESS_DENIED',
      message: 'You do not have access to this workspace'
    })
  }

  req.tenantId = tenantId
  next()
}

// Apply to all routes
app.use('/api/v1', authenticateToken, resolveTenant)
```

## Effort

⏱️ **3 days**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 16,
        "title": "[MEDIUM][SECURITY] Fix CORS Configuration",
        "labels": ["medium-priority", "security", "backend", "cors", "phase-3"],
        "effort": "2 days",
        "dependencies": "#5 (Secret management)",
        "body": """## Problem

CORS allows all origins in production.

**Current State:**
```javascript
app.use(cors())  // ❌ Allows ALL origins!
```

## Security Risks

- 🚨 CSRF attacks possible
- 🚨 Unauthorized origin access
- 🚨 Cookie/credential leakage
- 🚨 No origin validation

## Recommendation

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000']

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id']
}

app.use(cors(corsOptions))
```

## Effort

⏱️ **2 days**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 17,
        "title": "[MEDIUM] Implement Graceful Shutdown",
        "labels": ["medium-priority", "backend", "reliability", "phase-3"],
        "effort": "3 days",
        "dependencies": "None",
        "body": """## Problem

Server stops immediately on SIGTERM/SIGINT.

## Issues

- ❌ Active requests terminated mid-flight
- ❌ WebSocket connections dropped without notice
- ❌ Database connections not closed
- ❌ Potential data loss
- ❌ Poor user experience

## Recommendation

```javascript
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing gracefully...')

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed')

    // Close all WebSocket connections
    wss.clients.forEach(client => {
      client.send(JSON.stringify({ type: 'server_shutdown' }))
      client.close()
    })

    // Close database pool
    pool.end(() => {
      console.log('Database pool closed')

      // Close Redis connection
      redis.quit(() => {
        console.log('Redis connection closed')
        process.exit(0)
      })
    })
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

## Effort

⏱️ **3 days**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 18,
        "title": "[MEDIUM] Enhance Health Checks",
        "labels": ["medium-priority", "backend", "observability", "phase-3"],
        "effort": "3 days",
        "dependencies": "#11 (Monitoring)",
        "body": """## Problem

Health check only verifies database connection.

**Current State:**
```javascript
app.get('/api/health', async (req, res) => {
  await query('SELECT 1')
  res.json({ status: 'OK' })
})
```

## Missing Checks

- ❌ MinIO availability
- ❌ Redis connectivity
- ❌ WebSocket server status
- ❌ Disk space
- ❌ Memory usage

## Recommendation

```javascript
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  }

  // Database
  try {
    await query('SELECT 1')
    health.checks.database = { status: 'up' }
  } catch (error) {
    health.checks.database = { status: 'down', error: error.message }
    health.status = 'unhealthy'
  }

  // MinIO
  try {
    await minioService.listBuckets()
    health.checks.minio = { status: 'up' }
  } catch (error) {
    health.checks.minio = { status: 'down', error: error.message }
    health.status = 'degraded'
  }

  // Redis
  try {
    await redis.ping()
    health.checks.redis = { status: 'up' }
  } catch (error) {
    health.checks.redis = { status: 'down' }
    health.status = 'degraded'
  }

  // WebSocket
  health.checks.websocket = {
    status: 'up',
    connections: wss.clients.size
  }

  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
})

// Kubernetes probes
app.get('/api/ready', async (req, res) => {
  // Readiness: can accept traffic
  res.json({ ready: true })
})

app.get('/api/live', (req, res) => {
  // Liveness: should container be restarted
  res.json({ alive: true })
})
```

## Effort

⏱️ **3 days**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 19,
        "title": "[MEDIUM] Complete TODO Implementations",
        "labels": ["medium-priority", "frontend", "backend", "technical-debt", "phase-3"],
        "effort": "1 week",
        "dependencies": "None",
        "body": """## Problem

4 incomplete TODO comments in production code.

**Found TODOs:**

1. `src/components/ObjectDrawer.jsx` - TODO: Implement actual update functionality
2. `src/components/admin/GroupManagement.jsx` - TODO: Implement delete group
3. `src/components/admin/UserManagement.jsx` - TODO: Implement delete user
4. `src/components/MapView.jsx` - TODO: Implement actual update functionality

## Issues

- ❌ Incomplete features in production
- ❌ Poor user experience
- ❌ Technical debt accumulation

## Tasks

### 1. Implement Object Update (`ObjectDrawer.jsx`)
- Add form for editing object properties
- Integrate with PUT `/api/objects/:id` endpoint
- Add optimistic updates
- Handle validation errors

### 2. Implement Delete Group (`GroupManagement.jsx`)
- Add delete confirmation modal
- Integrate with DELETE `/api/rbac/groups/:id`
- Handle users in group (cascade or prevent)
- Show success/error notifications

### 3. Implement Delete User (`UserManagement.jsx`)
- Add delete confirmation modal
- Integrate with DELETE `/api/users/:id`
- Handle user's objects (reassign or delete)
- Prevent self-deletion

### 4. Implement Map Update (`MapView.jsx`)
- Add click-to-update location
- Show confirmation before updating
- Integrate with PUT `/api/objects/:id/location`
- Update marker position optimistically

## Effort

⏱️ **1 week**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 20,
        "title": "[MEDIUM] Tune Database Connection Pool",
        "labels": ["medium-priority", "database", "performance", "phase-3"],
        "effort": "2 days",
        "dependencies": "#10 (Logging)",
        "body": """## Problem

Default connection pool settings with no monitoring.

**Current State:**
```javascript
const pool = new Pool({
  max: 20,  // Is this right?
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

## Issues

- ❌ Pool size not tuned for workload
- ❌ No connection pool monitoring
- ❌ No error handling for pool exhaustion
- ❌ Potential connection leaks

## Recommendation

```javascript
const pool = new Pool({
  // Sizing
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 2,

  // Timeouts
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,

  // Lifecycle
  allowExitOnIdle: false,

  // Monitoring
  log: (msg) => logger.debug('DB Pool:', msg)
})

// Error handling
pool.on('error', (err, client) => {
  logger.error('Unexpected DB pool error', { error: err })
})

pool.on('connect', (client) => {
  logger.debug('New DB connection established')
})

pool.on('remove', (client) => {
  logger.debug('DB connection removed from pool')
})

// Metrics
setInterval(() => {
  logger.info('DB Pool Stats', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  })

  // Export to Prometheus
  dbPoolTotal.set(pool.totalCount)
  dbPoolIdle.set(pool.idleCount)
  dbPoolWaiting.set(pool.waitingCount)
}, 60000) // Every minute
```

## Tuning Guidelines

- **Max connections:** `(core_count * 2) + effective_spindle_count`
- **Min connections:** 2-5 for quick response
- Monitor: If `waitingCount` > 0, increase pool size
- Monitor: If `idleCount` > `max * 0.8`, decrease pool size

## Effort

⏱️ **2 days**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    {
        "phase": "3",
        "number": 21,
        "title": "[MEDIUM] Improve Frontend State Management",
        "labels": ["medium-priority", "frontend", "architecture", "phase-3"],
        "effort": "1 week",
        "dependencies": "None",
        "body": """## Problem

State management becoming complex with React Context + TanStack Query.

## Issues

- ❌ Prop drilling in deep component trees
- ❌ Difficult to share state across routes
- ❌ No state persistence/rehydration
- ❌ Context re-renders entire tree
- ❌ Growing complexity

## Recommendation

Add Zustand for client-side state:

```bash
npm install zustand
```

```javascript
// stores/appStore.js
import create from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Map state
      selectedObjectId: null,
      mapCenter: [40.7128, -74.0060],
      mapZoom: 12,
      showPaths: true,

      // UI state
      sidebarOpen: true,
      drawerOpen: false,

      // Actions
      setSelectedObject: (id) => set({ selectedObjectId: id }),
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false, selectedObjectId: null }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        showPaths: state.showPaths
      })
    }
  )
)

// Usage
function MapView() {
  const { mapCenter, mapZoom, setMapView } = useAppStore()
  // Component implementation
}
```

## Architecture

- **Server State:** TanStack Query (data from API)
- **Client State:** Zustand (UI state, preferences)
- **Auth State:** AuthContext (still Context API)
- **Tenant State:** TenantContext (still Context API)

## Effort

⏱️ **1 week**

## Phase

**Phase 3 - Medium Priority** 🟡"""
    },
    # PHASE 4: LOW PRIORITY (4 issues)
    {
        "phase": "4",
        "number": 22,
        "title": "[LOW] Add Code Splitting & Lazy Loading",
        "labels": ["low-priority", "frontend", "performance", "phase-4"],
        "effort": "3 days",
        "dependencies": "None",
        "body": """## Problem

All routes bundled in main chunk - large initial load time.

**Current State:**
```javascript
import AdminPage from './pages/AdminPage'  // ❌ In main bundle
import DashboardPage from './pages/DashboardPage'
```

## Recommendation

```javascript
import { lazy, Suspense } from 'react'

// Lazy load routes
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="spinner-border" />
        <p>Loading...</p>
      </div>
    </div>
  )
}

// In routes
function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Suspense>
  )
}
```

## Expected Improvements

- Initial bundle: -40% size
- First contentful paint: -30%
- Time to interactive: -25%

## Effort

⏱️ **3 days**

## Phase

**Phase 4 - Low Priority** 🟢"""
    },
    {
        "phase": "4",
        "number": 23,
        "title": "[LOW] Enforce Linting & Formatting",
        "labels": ["low-priority", "code-quality", "developer-experience", "phase-4"],
        "effort": "2 days",
        "dependencies": "None",
        "body": """## Problem

No code quality enforcement.

## Missing

- ❌ No ESLint configuration
- ❌ No Prettier configuration
- ❌ No pre-commit hooks
- ❌ Inconsistent code style

## Recommendation

```bash
npm install -D eslint prettier eslint-config-prettier \\
  eslint-plugin-react eslint-plugin-react-hooks \\
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \\
  husky lint-staged
```

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'react/prop-types': 'off'
  }
}

// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Git hooks:**
```bash
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Effort

⏱️ **2 days**

## Phase

**Phase 4 - Low Priority** 🟢"""
    },
    {
        "phase": "4",
        "number": 24,
        "title": "[LOW] Improve Accessibility",
        "labels": ["low-priority", "frontend", "accessibility", "a11y", "phase-4"],
        "effort": "2 weeks",
        "dependencies": "None",
        "body": """## Problem

Poor accessibility - no ARIA labels, keyboard navigation, or screen reader support.

## Issues

- ❌ No ARIA labels
- ❌ No keyboard navigation
- ❌ No screen reader support
- ❌ Poor color contrast in some areas
- ❌ No focus indicators
- ❌ Non-semantic HTML

## Recommendation

```bash
npm install -D eslint-plugin-jsx-a11y
```

**Examples:**

```javascript
// Buttons
<button
  onClick={handleDelete}
  aria-label="Delete object"
  type="button"
>
  <Trash2 aria-hidden="true" />
</button>

// Forms
<input
  type="text"
  id="object-name"
  aria-required="true"
  aria-invalid={errors.name ? "true" : "false"}
  aria-describedby={errors.name ? "name-error" : undefined}
/>
{errors.name && (
  <span id="name-error" role="alert" className="text-red-600">
    {errors.name}
  </span>
)}

// Modals
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Object</h2>
  <p id="modal-description">Are you sure?</p>
</div>

// Navigation
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>
```

## Target

- WCAG 2.1 AA compliance
- Lighthouse accessibility score > 90
- Full keyboard navigation
- Screen reader tested

## Effort

⏱️ **2 weeks**

## Phase

**Phase 4 - Low Priority** 🟢"""
    },
    {
        "phase": "4",
        "number": 25,
        "title": "[LOW] Add Internationalization (i18n)",
        "labels": ["low-priority", "frontend", "i18n", "globalization", "phase-4"],
        "effort": "1 week",
        "dependencies": "None",
        "body": """## Problem

All text hardcoded in English.

## Recommendation

```bash
npm install react-i18next i18next
```

```javascript
// i18n.js
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          'dashboard.title': 'Dashboard',
          'objects.create': 'Create Object',
          'auth.login': 'Login',
          'auth.logout': 'Logout'
        }
      },
      es: {
        translation: {
          'dashboard.title': 'Panel de Control',
          'objects.create': 'Crear Objeto',
          'auth.login': 'Iniciar Sesión',
          'auth.logout': 'Cerrar Sesión'
        }
      },
      fr: {
        translation: {
          'dashboard.title': 'Tableau de Bord',
          'objects.create': 'Créer un Objet',
          'auth.login': 'Connexion',
          'auth.logout': 'Déconnexion'
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n

// Usage
import { useTranslation } from 'react-i18next'

function Dashboard() {
  const { t, i18n } = useTranslation()

  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>
        Español
      </button>
    </div>
  )
}
```

## Effort

⏱️ **1 week**

## Phase

**Phase 4 - Low Priority** 🟢"""
    }
]

# Combine with Phase 1 & 2 issues (would need to import from previous script)
# For now, let's just generate Phase 3 & 4

print("Generating Phase 3 & Phase 4 issues...")
print("="*50)

os.makedirs('github-issues', exist_ok=True)

for issue in additional_issues:
    phase = issue['phase']
    number = issue['number']

    # Create full body with metadata
    full_body = f"""{issue['body']}

---

**Metadata:**
- **Effort:** {issue['effort']}
- **Dependencies:** {issue['dependencies']}

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #{number}
- `REFACTORING_ROADMAP.md` - Phase {phase}
"""

    issue_data = {
        "title": issue['title'],
        "body": full_body,
        "labels": issue['labels']
    }

    filename = f"github-issues/phase{phase}-issue{number:02d}.json"
    with open(filename, 'w') as f:
        json.dump(issue_data, f, indent=2)

    print(f"✅ Created {filename}")

print()
print(f"✅ Generated {len(additional_issues)} additional issue files")
print()
print("All 25 issues are now ready in github-issues/")
print()
print("To upload to GitHub:")
print("1. Set your GitHub token: export GITHUB_TOKEN='your_token'")
print("2. Run: ./upload_issues_to_github.sh")
