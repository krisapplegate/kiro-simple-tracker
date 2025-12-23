#!/usr/bin/env python3
"""
Script to create GitHub issues for architecture review
Generates all 25 issues from ARCHITECTURE_REVIEW.md
"""

import json
import os

# Issue definitions
issues = [
    # PHASE 1: CRITICAL (7 issues)
    {
        "phase": "1",
        "number": 1,
        "title": "[CRITICAL] Refactor Monolithic Server Architecture",
        "labels": ["critical", "architecture", "backend", "refactoring", "phase-1"],
        "effort": "2 weeks",
        "dependencies": "None (BLOCKS: #6, #7, #8, #12, #15)",
        "body": """## Problem

`backend/server.js` is **1,323 lines** containing routes, business logic, WebSocket handling, and database queries in a single file.

**Location:** `backend/server.js`

## Issues

- ❌ Violates Single Responsibility Principle
- ❌ Impossible to scale individual components
- ❌ Difficult to test in isolation
- ❌ High coupling, low cohesion
- ❌ Merge conflicts inevitable in team environments

## Recommendation

Implement layered architecture:

```
backend/
├── routes/           # Express route definitions
│   ├── auth.routes.js
│   ├── objects.routes.js
│   ├── rbac.routes.js
│   └── admin.routes.js
├── controllers/      # Request/response handling
├── services/         # Business logic
├── repositories/     # Data access layer
├── middleware/       # Reusable middleware
└── websocket/        # WebSocket handling
```

## Implementation Steps

1. Create directory structure
2. Extract routes to separate files
3. Create controller layer for request handling
4. Move business logic to services
5. Implement repository pattern for data access
6. Update tests to work with new structure
7. Maintain >80% test coverage during refactor

## Success Criteria

- [ ] No file exceeds 300 lines
- [ ] Clear separation of concerns
- [ ] All tests passing
- [ ] Test coverage maintained

## Effort

⏱️ **2 weeks**

## Dependencies

None - **Blocking issue** for #6, #7, #8, #12, #15

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #1
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 2,
        "title": "[CRITICAL][SECURITY] Fix WebSocket Authentication Vulnerability",
        "labels": ["critical", "security", "websocket", "backend", "phase-1"],
        "effort": "1 week",
        "dependencies": "None",
        "body": """## Problem

WebSocket connections allow clients to claim **any tenant ID** without authentication.

**Location:** `backend/server.js:1236-1271`

**Current Code (VULNERABLE):**
```javascript
wss.on('connection', (ws) => {
  ws.tenantId = null  // ❌ No authentication!
  ws.on('message', (message) => {
    if (data.type === 'join_tenant') {
      ws.tenantId = data.tenantId  // ❌ Client can claim ANY tenant!
    }
  })
})
```

## Vulnerabilities

1. ❌ No JWT validation on WebSocket connection
2. ❌ **CRITICAL DATA LEAK** - Client can access any tenant's data
3. ❌ No origin validation
4. ❌ No rate limiting on messages

## Recommendation

```javascript
wss.on('connection', async (ws, req) => {
  // Extract and validate JWT from query params or headers
  const token = extractTokenFromRequest(req)
  try {
    const user = jwt.verify(token, JWT_SECRET)
    ws.userId = user.id
    ws.tenantId = user.tenantId
    ws.isAuthenticated = true
  } catch (error) {
    ws.close(1008, 'Unauthorized')
    return
  }
})
```

## Implementation Steps

1. Create `extractTokenFromRequest()` helper
2. Validate JWT on WebSocket connection
3. Store authenticated user info on WebSocket
4. Remove client-controlled `join_tenant` message
5. Update frontend to pass JWT in WebSocket connection
6. Add integration tests for WebSocket auth

## Success Criteria

- [ ] JWT validation on all WebSocket connections
- [ ] Clients cannot specify tenant ID
- [ ] Unauthorized connections closed immediately
- [ ] Integration tests verify auth flow

## Effort

⏱️ **1 week**

## Dependencies

None

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #2
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 3,
        "title": "[CRITICAL] Remove Production Simulation Code",
        "labels": ["critical", "backend", "performance", "phase-1"],
        "effort": "2 days",
        "dependencies": "None",
        "body": """## Problem

Location simulation logic runs in **ALL environments** including production.

**Location:** `backend/server.js:1273-1317`

**Current Code:**
```javascript
// Runs every 10 seconds in production!
setInterval(async () => {
  const result = await query('SELECT id, lat, lng, tenant_id FROM objects WHERE status = $1', ['active'])
  // Updates 30% of objects randomly
}, 10000)
```

## Issues

- ❌ Consumes CPU/DB resources in production
- ❌ No environment check (`NODE_ENV`)
- ❌ Can interfere with real data
- ❌ Masks performance issues in testing
- ❌ Creates confusion about data source

## Recommendation

**Remove entirely from `server.js`**

Simulation already exists in `/simulator/` directory and should be used separately.

## Implementation Steps

1. Remove lines 1273-1317 from `backend/server.js`
2. Update documentation to reference `/simulator/` for testing
3. Verify no code depends on simulated data
4. Test that real location updates still work

## Success Criteria

- [ ] No simulation code in `server.js`
- [ ] Production environment runs without simulation
- [ ] Tests use `/simulator/` or mock data
- [ ] Documentation updated

## Effort

⏱️ **2 days**

## Dependencies

None

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #3
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 4,
        "title": "[CRITICAL] Implement Database Migration Management",
        "labels": ["critical", "database", "devops", "phase-1"],
        "effort": "1 week",
        "dependencies": "None",
        "body": """## Problem

Database migrations are applied manually via copy/paste commands.

**Current Process:**
```bash
docker cp database/migrate_add_images.sql container:/tmp/
docker-compose exec database psql -U tracker_user -f /tmp/migrate_add_images.sql
```

## Issues

- ❌ No migration version tracking
- ❌ No rollback capability
- ❌ Manual process is error-prone
- ❌ CI/CD applies all migrations every time (inefficient)
- ❌ No migration ordering guarantees
- ❌ Difficult to coordinate across environments

## Recommendation

Implement proper migration tool:

```bash
npm install knex
# or
npm install sequelize-cli
# or
npm install node-pg-migrate
```

**Target Structure:**
```
database/
├── migrations/
│   ├── 20231201000000_initial_schema.js
│   ├── 20231202000000_add_rbac.js
│   ├── 20231203000000_add_images.js
│   └── 20231204000000_add_cascade_deletes.js
├── seeds/
│   └── 001_demo_data.js
└── knexfile.js  # Migration configuration
```

## Implementation Steps

1. Choose migration tool (recommend: `node-pg-migrate`)
2. Install and configure
3. Convert existing SQL migrations to tool format
4. Add migration table to track versions
5. Update CI/CD to run migrations
6. Update documentation with new process
7. Test rollback functionality

## Success Criteria

- [ ] All migrations tracked in database
- [ ] One-command migration: `npm run migrate:latest`
- [ ] Rollback capability: `npm run migrate:rollback`
- [ ] CI/CD automatically runs pending migrations
- [ ] No manual SQL file copying required

## Effort

⏱️ **1 week**

## Dependencies

None

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #4
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 5,
        "title": "[CRITICAL][SECURITY] Remove Hardcoded Secrets from Configuration",
        "labels": ["critical", "security", "devops", "configuration", "phase-1"],
        "effort": "3 days",
        "dependencies": "None (BLOCKS: #16)",
        "body": """## Problem

Secrets are hardcoded in `docker-compose.yml` and committed to git.

**Location:** `docker-compose.yml`

**Current Configuration:**
```yaml
backend:
  environment:
    - JWT_SECRET=your-development-secret-key  # ❌ Committed to git!
    - DB_PASSWORD=tracker_password             # ❌ Committed to git!
    - MINIO_ACCESS_KEY=minioadmin              # ❌ Default credentials!
```

## Security Risks

- 🚨 Secrets in version control history
- 🚨 Same secrets used across all environments
- 🚨 Default MinIO credentials
- 🚨 Cannot rotate secrets without code commit
- 🚨 Secrets visible to all repository contributors

## Recommendation

### Development
```yaml
backend:
  env_file:
    - .env.local  # Not committed to git
  environment:
    - NODE_ENV=${NODE_ENV}
```

### Production
Use proper secret management:
- AWS: AWS Secrets Manager or Parameter Store
- GCP: Secret Manager
- Azure: Key Vault
- Kubernetes: Secrets
- Self-hosted: HashiCorp Vault

## Implementation Steps

1. Create `.env.example` template
2. Add `.env.local` to `.gitignore`
3. Update `docker-compose.yml` to use `env_file`
4. Generate strong secrets for each environment
5. Document secret rotation process
6. Update deployment documentation
7. Rotate all current secrets (assume compromised)

## Success Criteria

- [ ] No secrets in git repository
- [ ] `.env.local` in `.gitignore`
- [ ] Different secrets per environment
- [ ] Secret rotation process documented
- [ ] All current secrets rotated

## Effort

⏱️ **3 days**

## Dependencies

None - **Blocks** #16 (CORS configuration)

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #5
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 6,
        "title": "[CRITICAL] Implement Comprehensive Error Handling",
        "labels": ["critical", "backend", "error-handling", "phase-1"],
        "effort": "1 week",
        "dependencies": "#1 (Refactor architecture) - BLOCKS: #10",
        "body": """## Problem

Inconsistent error handling throughout the application.

**Current Issues:**

```javascript
// ❌ Generic errors - no context
catch (error) {
  console.error('Error:', error)
  res.status(500).json({ message: 'Server error' })
}

// ❌ Information disclosure
catch (error) {
  res.status(500).json({ error: error.message })  // Exposes internals
}

// ❌ No error classification
```

## Issues

- ❌ Generic 500 errors everywhere
- ❌ Stack traces leaked in production
- ❌ No error categorization (operational vs programming)
- ❌ Inconsistent error responses
- ❌ Difficult to debug production issues

## Recommendation

Implement centralized error handling:

```javascript
// middleware/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

// Common error types
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR')
    this.errors = errors
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, 404, 'NOT_FOUND')
  }
}

// Global error handler
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: 'error',
      error: err,
      message: err.message,
      stack: err.stack
    })
  }

  // Production: Don't leak error details
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      errors: err.errors
    })
  }

  // Programming errors - log and send generic message
  logger.error('Non-operational error:', err)
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  })
}
```

## Implementation Steps

1. Create error classes (`AppError`, `ValidationError`, etc.)
2. Create centralized error handler middleware
3. Update all route handlers to use error classes
4. Replace `console.error` with proper logging
5. Add error tests
6. Document error handling patterns

## Success Criteria

- [ ] All errors use error classes
- [ ] Centralized error handler in place
- [ ] No stack traces in production
- [ ] Consistent error response format
- [ ] Error handling tests added

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #1 (Refactor architecture)
**Blocks:** #10 (Logging infrastructure)

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #6
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    {
        "phase": "1",
        "number": 7,
        "title": "[CRITICAL] Add API Versioning",
        "labels": ["critical", "backend", "api", "breaking-change", "phase-1"],
        "effort": "1 week",
        "dependencies": "#1 (Refactor architecture) - BLOCKS: #14",
        "body": """## Problem

All routes at `/api/*` with no versioning strategy.

## Issues

- ❌ Breaking changes require coordinated frontend/backend deployment
- ❌ No backward compatibility for clients
- ❌ Difficult to deprecate endpoints gracefully
- ❌ Cannot support multiple client versions
- ❌ Risky to evolve API

## Recommendation

**Option 1: Version in URL** (Recommended)
```javascript
app.use('/api/v1', v1Router)
app.use('/api/v2', v2Router)

// v1 router
const v1Router = express.Router()
v1Router.use('/auth', authRoutesV1)
v1Router.use('/objects', objectsRoutesV1)
v1Router.use('/admin', adminRoutesV1)
```

**Option 2: Version in headers**
```javascript
app.use((req, res, next) => {
  req.apiVersion = req.headers['api-version'] || 'v1'
  next()
})
```

**Recommendation: Use Option 1** (URL-based) for better discoverability and caching.

## Migration Strategy

1. Current `/api/*` → `/api/v1/*` (backward compatible alias)
2. Add deprecation warning header to v1 responses
3. Support v1 and v2 in parallel for 3 months
4. Document migration path for clients
5. Remove v1 after deprecation period

## Implementation Steps

1. Create `routes/v1/` directory
2. Move existing routes to v1
3. Create v1 router
4. Add backward compatibility for `/api/*` → `/api/v1/*`
5. Add deprecation headers middleware
6. Update frontend to use `/api/v1/*`
7. Update API documentation
8. Add version negotiation tests

## Success Criteria

- [ ] All routes under `/api/v1/*`
- [ ] Backward compatibility maintained
- [ ] Deprecation warnings added
- [ ] Documentation updated
- [ ] Tests verify version routing

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #1 (Refactor architecture)
**Blocks:** #14 (API documentation)

## Phase

**Phase 1 - Critical** 🔴

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #7
- `REFACTORING_ROADMAP.md` - Phase 1"""
    },
    # PHASE 2: HIGH PRIORITY (7 issues)
    {
        "phase": "2",
        "number": 8,
        "title": "[HIGH][SECURITY] Add Request Validation",
        "labels": ["high-priority", "security", "backend", "validation", "phase-2"],
        "effort": "1 week",
        "dependencies": "#1 (Refactor architecture)",
        "body": """## Problem

Direct use of user input without validation - vulnerable to injection attacks.

**Current State:**
```javascript
app.post('/api/objects', authenticateToken, async (req, res) => {
  const { name, type, lat, lng } = req.body  // ❌ No validation
  // Direct use of user input
})
```

## Security Risks

- 🚨 SQL injection potential
- 🚨 XSS attacks through unvalidated input
- 🚨 Type confusion bugs
- 🚨 Invalid data in database
- 🚨 No input sanitization

## Recommendation

```bash
npm install joi  # or zod, yup, express-validator
```

```javascript
const Joi = require('joi')

const objectSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  type: Joi.string().valid('vehicle', 'person', 'asset', 'device').required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  tags: Joi.array().items(Joi.string()).max(10),
  customFields: Joi.object(),
  description: Joi.string().max(1000)
})

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      })
    }

    req.validatedData = value
    next()
  }
}

app.post('/api/objects', authenticateToken, validate(objectSchema), ...)
```

## Implementation Steps

1. Choose validation library (recommend: Joi)
2. Create validation schemas for all endpoints
3. Create validation middleware
4. Add validation to all POST/PUT endpoints
5. Update error handling for validation errors
6. Add validation tests
7. Document validation rules

## Success Criteria

- [ ] 100% of endpoints validated
- [ ] All user input sanitized
- [ ] Validation errors have clear messages
- [ ] Tests verify validation rules
- [ ] Documentation includes validation rules

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #1 (Refactor architecture)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #8
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 9,
        "title": "[HIGH][SECURITY] Implement Rate Limiting",
        "labels": ["high-priority", "security", "backend", "dos-protection", "phase-2"],
        "effort": "3 days",
        "dependencies": "None",
        "body": """## Problem

No rate limiting on any endpoints - vulnerable to DoS and brute force attacks.

## Security Risks

- 🚨 Brute force attacks on login endpoint
- 🚨 API abuse
- 🚨 Denial of Service (DoS)
- 🚨 Resource exhaustion
- 🚨 Cost explosion in cloud environments

## Recommendation

```bash
npm install express-rate-limit
npm install rate-limit-redis  # For distributed rate limiting
```

```javascript
const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
})

// WebSocket connection limit
const wsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 WebSocket connections per minute
})

app.use('/api/', apiLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
```

## Implementation Steps

1. Install express-rate-limit
2. Set up Redis for distributed rate limiting (if using multiple servers)
3. Configure rate limiters for different endpoint types
4. Add rate limit headers to responses
5. Add monitoring for rate limit hits
6. Document rate limits in API docs
7. Add tests for rate limiting

## Success Criteria

- [ ] Rate limiting on all endpoints
- [ ] Stricter limits on auth endpoints
- [ ] Rate limit info in response headers
- [ ] Monitoring alerts for abuse
- [ ] Documentation updated

## Effort

⏱️ **3 days**

## Dependencies

None

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #9
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 10,
        "title": "[HIGH] Add Logging Infrastructure",
        "labels": ["high-priority", "backend", "logging", "observability", "phase-2"],
        "effort": "1 week",
        "dependencies": "#6 (Error handling) - BLOCKS: #11",
        "body": """## Problem

Unstructured logging using `console.log()` everywhere.

**Current State:**
```javascript
console.log('User logged in:', userId)  // ❌ Unstructured
console.error('Error:', error)           // ❌ No context
```

## Issues

- ❌ No log levels
- ❌ No log persistence
- ❌ No structured logging
- ❌ Difficult to search/filter logs
- ❌ No correlation IDs for request tracking
- ❌ Cannot change log level without code changes

## Recommendation

```bash
npm install winston
npm install express-winston  # For request logging
```

```javascript
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'location-tracker',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Usage
logger.info('User logged in', { userId, tenantId })
logger.error('Database query failed', { error, query, params })
logger.warn('Rate limit exceeded', { ip, endpoint })
```

**Request logging:**
```javascript
const expressWinston = require('express-winston')

app.use(expressWinston.logger({
  transports: [new winston.transports.File({ filename: 'logs/requests.log' })],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false
}))
```

## Implementation Steps

1. Install Winston and express-winston
2. Create logger configuration
3. Replace all `console.log` with `logger.*`
4. Add request logging middleware
5. Add correlation IDs for request tracking
6. Set up log rotation
7. Configure log aggregation (CloudWatch, Datadog, etc.)
8. Document logging standards

## Success Criteria

- [ ] No `console.log` in code
- [ ] Structured JSON logging
- [ ] Log levels configurable via env var
- [ ] Request correlation IDs
- [ ] Logs persisted to files
- [ ] Log rotation configured

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #6 (Error handling)
**Blocks:** #11 (Monitoring)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #10
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 11,
        "title": "[HIGH] Add Observability & Monitoring",
        "labels": ["high-priority", "backend", "monitoring", "observability", "phase-2"],
        "effort": "1 week",
        "dependencies": "#10 (Logging) - BLOCKS: #18",
        "body": """## Problem

No application metrics, monitoring, or alerting.

## Missing

- ❌ Application metrics (response times, error rates)
- ❌ Database performance monitoring
- ❌ WebSocket connection metrics
- ❌ Business metrics (objects created, locations updated)
- ❌ Alerting on errors or anomalies
- ❌ No observability into production issues

## Recommendation

```bash
npm install prom-client  # Prometheus metrics
```

```javascript
const prometheus = require('prom-client')

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
})

const objectsCreated = new prometheus.Counter({
  name: 'objects_created_total',
  help: 'Total number of objects created',
  labelNames: ['tenant_id', 'type']
})

const activeConnections = new prometheus.Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant_id']
})

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type', 'table']
})

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration)
  })

  next()
})

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(await prometheus.register.metrics())
})

// Business metrics
objectsCreated.labels(tenantId, type).inc()
activeConnections.labels(tenantId).set(wss.clients.size)
```

## Dashboards

Create Grafana dashboards for:
- HTTP request rates and latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- WebSocket connection counts
- Business metrics (objects created per hour, location updates)
- Resource usage (CPU, memory, DB connections)

## Alerting Rules

- Error rate > 1% for 5 minutes
- p95 latency > 1 second
- Database connection pool exhausted
- WebSocket connections > 10,000
- Disk space < 10%

## Implementation Steps

1. Install prom-client
2. Create metrics definitions
3. Add metrics collection throughout app
4. Expose /metrics endpoint
5. Set up Prometheus scraping
6. Create Grafana dashboards
7. Configure alerting rules
8. Document metrics

## Success Criteria

- [ ] Metrics exported in Prometheus format
- [ ] /metrics endpoint secured
- [ ] Dashboards showing key metrics
- [ ] Alerts configured for critical issues
- [ ] Documentation for all metrics

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #10 (Logging)
**Blocks:** #18 (Enhanced health checks)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #11
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 12,
        "title": "[HIGH] Implement Repository Pattern",
        "labels": ["high-priority", "backend", "architecture", "database", "phase-2"],
        "effort": "2 weeks",
        "dependencies": "#1 (Refactor architecture) - BLOCKS: #13",
        "body": """## Problem

Direct SQL queries in route handlers - difficult to maintain and test.

**Current State:**
```javascript
app.get('/api/objects', authenticateToken, async (req, res) => {
  const result = await query(
    'SELECT * FROM objects WHERE tenant_id = $1',
    [req.user.tenantId]
  )  // ❌ SQL in route handler
  res.json(result.rows)
})
```

## Issues

- ❌ SQL scattered throughout codebase
- ❌ Difficult to test business logic
- ❌ No query reusability
- ❌ Hard to optimize database access
- ❌ Cannot easily switch databases
- ❌ Violates separation of concerns

## Recommendation

Implement Repository Pattern:

```javascript
// repositories/ObjectRepository.js
class ObjectRepository {
  async findByTenant(tenantId, filters = {}) {
    let queryText = 'SELECT * FROM objects WHERE tenant_id = $1'
    const params = [tenantId]

    if (filters.types?.length > 0) {
      queryText += ' AND type = ANY($2)'
      params.push(filters.types)
    }

    if (filters.tags?.length > 0) {
      queryText += ' AND tags && $3'
      params.push(filters.tags)
    }

    const result = await db.query(queryText, params)
    return result.rows.map(this.mapToEntity)
  }

  async findById(id, tenantId) {
    const result = await db.query(
      'SELECT * FROM objects WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null
  }

  async create(objectData) {
    const result = await db.query(
      `INSERT INTO objects (name, type, lat, lng, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [objectData.name, objectData.type, objectData.lat, objectData.lng,
       objectData.tenantId, objectData.createdBy]
    )
    return this.mapToEntity(result.rows[0])
  }

  async update(id, tenantId, updates) {
    // Implementation
  }

  async delete(id, tenantId) {
    // Implementation
  }

  mapToEntity(row) {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

module.exports = new ObjectRepository()

// Usage in service
const objectRepository = require('../repositories/ObjectRepository')

class ObjectService {
  async getObjectsByTenant(tenantId, filters) {
    return await objectRepository.findByTenant(tenantId, filters)
  }
}
```

## Implementation Steps

1. Create `repositories/` directory
2. Implement base repository with common methods
3. Create repositories for each entity (Object, User, Tenant, etc.)
4. Update services to use repositories
5. Remove direct query calls from routes
6. Add repository tests
7. Document repository patterns

## Success Criteria

- [ ] All database access through repositories
- [ ] No SQL in route handlers
- [ ] Repository tests with >80% coverage
- [ ] Consistent data mapping
- [ ] Documentation complete

## Effort

⏱️ **2 weeks**

## Dependencies

**Requires:** #1 (Refactor architecture)
**Blocks:** #13 (Caching layer)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #12
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 13,
        "title": "[HIGH] Add Caching Layer",
        "labels": ["high-priority", "backend", "performance", "caching", "phase-2"],
        "effort": "1 week",
        "dependencies": "#12 (Repository pattern)",
        "body": """## Problem

Every request hits the database - no caching.

## Issues

- ❌ Repeated database queries for same data
- ❌ RBAC permission checks on every request
- ❌ Poor performance under load
- ❌ Unnecessary database load
- ❌ Higher cloud costs

## Common Cache Candidates

- User permissions (changes infrequently)
- Role definitions (rarely changes)
- Object type configurations
- Tenant information
- Frequently accessed objects

## Recommendation

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)

// Cache wrapper
class Cache {
  async get(key) {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async set(key, value, ttlSeconds = 300) {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  }

  async del(key) {
    await redis.del(key)
  }

  async delPattern(pattern) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

const cache = new Cache()

// Cache user permissions
async function getUserPermissions(userId, tenantId) {
  const cacheKey = `permissions:${userId}:${tenantId}`

  // Try cache first
  let permissions = await cache.get(cacheKey)
  if (permissions) {
    return permissions
  }

  // Cache miss - fetch from database
  permissions = await RBACService.getUserPermissions(userId, tenantId)

  // Cache for 5 minutes
  await cache.set(cacheKey, permissions, 300)

  return permissions
}

// Invalidate on role change
async function assignRoleToUser(userId, roleId) {
  await RBACService.assignRoleToUser(userId, roleId)

  // Invalidate all permission caches for this user
  await cache.delPattern(`permissions:${userId}:*`)
}

// Cache-aside pattern for objects
async function getObject(id, tenantId) {
  const cacheKey = `object:${id}:${tenantId}`

  let object = await cache.get(cacheKey)
  if (object) {
    return object
  }

  object = await objectRepository.findById(id, tenantId)
  if (object) {
    await cache.set(cacheKey, object, 600) // 10 minutes
  }

  return object
}
```

## Cache Invalidation Strategy

**Write-through:**
- Update database
- Update cache
- If cache update fails, delete from cache

**Time-based:**
- Short TTL (1-5 minutes) for frequently changing data
- Long TTL (1 hour+) for rarely changing data

**Event-based:**
- Invalidate on create/update/delete
- Use cache key patterns for bulk invalidation

## Implementation Steps

1. Install and configure Redis
2. Create cache wrapper class
3. Identify cache candidates
4. Implement cache-aside pattern
5. Add cache invalidation logic
6. Add cache metrics
7. Test cache hit/miss behavior
8. Document caching strategy

## Success Criteria

- [ ] Redis configured and operational
- [ ] RBAC permissions cached
- [ ] Cache hit rate > 70%
- [ ] Proper cache invalidation
- [ ] Cache metrics monitored
- [ ] Documentation complete

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #12 (Repository pattern)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #13
- `REFACTORING_ROADMAP.md` - Phase 2"""
    },
    {
        "phase": "2",
        "number": 14,
        "title": "[HIGH] Create API Documentation",
        "labels": ["high-priority", "backend", "documentation", "api", "phase-2"],
        "effort": "1 week",
        "dependencies": "#7 (API versioning)",
        "body": """## Problem

No OpenAPI/Swagger documentation for the API.

## Issues

- ❌ No machine-readable API specification
- ❌ Difficult for frontend developers to integrate
- ❌ No interactive API testing
- ❌ Hard to maintain API consistency
- ❌ No client SDK generation

## Recommendation

```bash
npm install swagger-jsdoc swagger-ui-express
```

```javascript
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Location Tracker API',
      version: '1.0.0',
      description: 'Multi-tenant location tracking API with RBAC'
    },
    servers: [
      { url: '/api/v1', description: 'Version 1' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./routes/**/*.js', './models/**/*.js']
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

/**
 * @swagger
 * /objects:
 *   get:
 *     summary: Get all objects for tenant
 *     tags: [Objects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated object types
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags
 *     responses:
 *       200:
 *         description: List of objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Object'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 * components:
 *   schemas:
 *     Object:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - type
 *         - lat
 *         - lng
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [vehicle, person, asset, device]
 *         lat:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         lng:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 */
```

## Documentation Requirements

Document all:
- ✅ Endpoints (GET, POST, PUT, DELETE)
- ✅ Request parameters (path, query, body)
- ✅ Response schemas
- ✅ Error responses
- ✅ Authentication requirements
- ✅ Rate limits
- ✅ Examples

## Implementation Steps

1. Install swagger packages
2. Create OpenAPI specification
3. Add JSDoc comments to all routes
4. Create schema definitions
5. Add examples for all endpoints
6. Test interactive documentation
7. Generate static HTML docs
8. Publish to docs site

## Success Criteria

- [ ] 100% of endpoints documented
- [ ] Interactive Swagger UI at /api-docs
- [ ] All schemas defined
- [ ] Request/response examples
- [ ] Authentication flow documented
- [ ] Client SDK can be generated

## Effort

⏱️ **1 week**

## Dependencies

**Requires:** #7 (API versioning)

## Phase

**Phase 2 - High Priority** 🟠

## Reference

- `ARCHITECTURE_REVIEW.md` - Issue #14
- `REFACTORING_ROADMAP.md` - Phase 2"""
    }
]

# Create issues directory
os.makedirs('github-issues', exist_ok=True)

# Generate JSON files for each issue
for issue in issues:
    phase = issue['phase']
    number = issue['number']

    # Create full body with metadata
    full_body = f"""{issue['body']}

---

**Metadata:**
- **Effort:** {issue['effort']}
- **Dependencies:** {issue['dependencies']}
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

print(f"\n✅ Generated {len(issues)} issue JSON files")
print("\nTo create these issues in GitHub, you can:")
print("1. Use the GitHub CLI: gh issue create --title 'TITLE' --body 'BODY' --label 'label1,label2'")
print("2. Use the GitHub API with curl")
print("3. Import manually via GitHub web interface")
print("\nNext: Create remaining Phase 3 and Phase 4 issues (Issues #15-25)")
