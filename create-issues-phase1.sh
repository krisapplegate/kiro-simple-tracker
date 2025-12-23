#!/bin/bash
# Script to create GitHub issues for architecture review items

REPO_OWNER="krisapplegate"
REPO_NAME="kiro-simple-tracker"
API_URL="https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/issues"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to create issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local milestone="$4"

    echo -e "${BLUE}Creating issue: $title${NC}"

    # Escape quotes in body
    body=$(echo "$body" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

    # Build JSON payload
    json_payload=$(cat <<EOF
{
  "title": "$title",
  "body": "$body",
  "labels": [$labels]
}
EOF
)

    # Create the issue using gh api if available, otherwise provide curl command
    if command -v gh &> /dev/null; then
        echo "$json_payload" | gh api repos/$REPO_OWNER/$REPO_NAME/issues --input -
    else
        echo "Please run this curl command:"
        echo "curl -X POST -H \"Authorization: token YOUR_GITHUB_TOKEN\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '$json_payload' \\"
        echo "  $API_URL"
        echo ""
    fi
}

echo -e "${GREEN}Creating Phase 1 - Critical Issues${NC}"
echo "======================================"

# Issue 1: Refactor Monolithic Server Architecture
create_issue \
    "[CRITICAL] Refactor Monolithic Server Architecture" \
    "## Problem\\n\`backend/server.js\` is 1,323 lines containing routes, business logic, WebSocket handling, and database queries in a single file.\\n\\n## Issues\\n- Violates Single Responsibility Principle\\n- Impossible to scale individual components\\n- Difficult to test in isolation\\n- High coupling, low cohesion\\n- Merge conflicts inevitable\\n\\n## Recommendation\\nImplement layered architecture:\\n\`\`\`\\nbackend/\\n├── routes/           # Express route definitions\\n├── controllers/      # Request/response handling\\n├── services/         # Business logic\\n├── repositories/     # Data access layer\\n├── middleware/       # Reusable middleware\\n└── websocket/        # WebSocket handling\\n\`\`\`\\n\\n## Effort\\n2 weeks\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #1" \
    "\"critical\", \"architecture\", \"backend\", \"refactoring\"" \
    ""

# Issue 2: Fix WebSocket Authentication
create_issue \
    "[CRITICAL][SECURITY] Fix WebSocket Authentication Vulnerability" \
    "## Problem\\nWebSocket connections allow clients to claim any tenant ID without authentication.\\n\\n**Current Code (VULNERABLE):**\\n\`\`\`javascript\\nwss.on('connection', (ws) => {\\n  ws.tenantId = null  // No authentication!\\n  ws.on('message', (message) => {\\n    if (data.type === 'join_tenant') {\\n      ws.tenantId = data.tenantId  // Client can claim ANY tenant!\\n    }\\n  })\\n})\\n\`\`\`\\n\\n## Vulnerabilities\\n1. No JWT validation on WebSocket connection\\n2. **CRITICAL DATA LEAK** - Client can access any tenant's data\\n3. No origin validation\\n4. No rate limiting\\n\\n## Recommendation\\n\`\`\`javascript\\nwss.on('connection', async (ws, req) => {\\n  const token = extractTokenFromRequest(req)\\n  try {\\n    const user = jwt.verify(token, JWT_SECRET)\\n    ws.userId = user.id\\n    ws.tenantId = user.tenantId\\n    ws.isAuthenticated = true\\n  } catch (error) {\\n    ws.close(1008, 'Unauthorized')\\n  }\\n})\\n\`\`\`\\n\\n## Effort\\n1 week\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #2" \
    "\"critical\", \"security\", \"websocket\", \"backend\"" \
    ""

# Issue 3: Remove Production Simulation Code
create_issue \
    "[CRITICAL] Remove Production Simulation Code" \
    "## Problem\\nLocation simulation logic runs in ALL environments including production.\\n\\n**Current Code:**\\n\`\`\`javascript\\n// Runs every 10 seconds in production!\\nsetInterval(async () => {\\n  const result = await query('SELECT id, lat, lng, tenant_id FROM objects WHERE status = \\$1', ['active'])\\n  // Updates 30% of objects randomly\\n}, 10000)\\n\`\`\`\\n\\n## Issues\\n- Consumes CPU/DB resources in production\\n- No environment check\\n- Can interfere with real data\\n- Masks performance issues\\n\\n## Recommendation\\n- Remove entirely from \`server.js\`\\n- Simulation already exists in \`/simulator/\` directory\\n- Use feature flags if needed for demos\\n\\n## Effort\\n2 days\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #3" \
    "\"critical\", \"backend\", \"performance\"" \
    ""

# Issue 4: Implement Database Migration Management
create_issue \
    "[CRITICAL] Implement Database Migration Management" \
    "## Problem\\nDatabase migrations are applied manually via copy/paste commands.\\n\\n**Current Process:**\\n\`\`\`bash\\ndocker cp database/migrate_add_images.sql container:/tmp/\\ndocker-compose exec database psql -U tracker_user -f /tmp/migrate_add_images.sql\\n\`\`\`\\n\\n## Issues\\n- No migration version tracking\\n- No rollback capability\\n- Manual process is error-prone\\n- CI/CD applies all migrations every time\\n- No migration ordering guarantees\\n\\n## Recommendation\\nImplement proper migration tool (knex, sequelize-cli, or node-pg-migrate):\\n\\n\`\`\`bash\\nnpm install knex\\n\`\`\`\\n\\n**Structure:**\\n\`\`\`\\ndatabase/\\n├── migrations/\\n│   ├── 001_initial_schema.sql\\n│   ├── 002_add_rbac.sql\\n│   ├── 003_add_images.sql\\n│   └── 004_add_cascade_deletes.sql\\n└── migrate.js  # Migration runner with version tracking\\n\`\`\`\\n\\n## Effort\\n1 week\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #4" \
    "\"critical\", \"database\", \"devops\"" \
    ""

# Issue 5: Remove Hardcoded Secrets
create_issue \
    "[CRITICAL][SECURITY] Remove Hardcoded Secrets from Configuration" \
    "## Problem\\nSecrets are hardcoded in \`docker-compose.yml\` and committed to git.\\n\\n**Current Configuration:**\\n\`\`\`yaml\\nbackend:\\n  environment:\\n    - JWT_SECRET=your-development-secret-key  # Committed to git!\\n    - DB_PASSWORD=tracker_password             # Committed to git!\\n    - MINIO_ACCESS_KEY=minioadmin              # Default credentials!\\n\`\`\`\\n\\n## Risks\\n- Secrets in version control history\\n- Same secrets used across environments\\n- Default MinIO credentials\\n\\n## Recommendation\\n\`\`\`yaml\\nbackend:\\n  env_file:\\n    - .env.local  # Not committed to git\\n  environment:\\n    - NODE_ENV=\\${NODE_ENV}\\n\`\`\`\\n\\n**Secret Management:**\\n- Development: \`.env.local\` (gitignored)\\n- Production: AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets\\n\\n## Effort\\n3 days\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #5" \
    "\"critical\", \"security\", \"devops\", \"configuration\"" \
    ""

# Issue 6: Implement Comprehensive Error Handling
create_issue \
    "[CRITICAL] Implement Comprehensive Error Handling" \
    "## Problem\\nInconsistent error handling throughout the application.\\n\\n**Current Issues:**\\n\`\`\`javascript\\n// Generic errors - no context\\ncatch (error) {\\n  console.error('Error:', error)\\n  res.status(500).json({ message: 'Server error' })\\n}\\n\\n// Information disclosure\\ncatch (error) {\\n  res.status(500).json({ error: error.message })  // Exposes internals\\n}\\n\`\`\`\\n\\n## Recommendation\\nImplement centralized error handling:\\n\\n\`\`\`javascript\\n// middleware/errorHandler.js\\nclass AppError extends Error {\\n  constructor(message, statusCode, code) {\\n    super(message)\\n    this.statusCode = statusCode\\n    this.code = code\\n    this.isOperational = true\\n  }\\n}\\n\\nconst errorHandler = (err, req, res, next) => {\\n  if (process.env.NODE_ENV === 'development') {\\n    // Return full error details\\n  } else {\\n    // Production: Don't leak error details\\n    if (err.isOperational) {\\n      res.status(err.statusCode).json({\\n        status: err.status,\\n        message: err.message\\n      })\\n    } else {\\n      logger.error('Non-operational error:', err)\\n      res.status(500).json({ message: 'Something went wrong' })\\n    }\\n  }\\n}\\n\`\`\`\\n\\n## Dependencies\\n- Issue #1 (Refactor architecture)\\n\\n## Effort\\n1 week\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #6" \
    "\"critical\", \"backend\", \"error-handling\"" \
    ""

# Issue 7: Add API Versioning
create_issue \
    "[CRITICAL] Add API Versioning" \
    "## Problem\\nAll routes at \`/api/*\` with no versioning strategy.\\n\\n## Issues\\n- Breaking changes require coordinated frontend/backend deployment\\n- No backward compatibility for clients\\n- Difficult to deprecate endpoints gracefully\\n\\n## Recommendation\\n**Option 1: Version in URL**\\n\`\`\`javascript\\napp.use('/api/v1', v1Router)\\napp.use('/api/v2', v2Router)\\n\`\`\`\\n\\n**Option 2: Version in headers**\\n\`\`\`javascript\\napp.use((req, res, next) => {\\n  req.apiVersion = req.headers['api-version'] || 'v1'\\n  next()\\n})\\n\`\`\`\\n\\n## Migration Strategy\\n- Support v1 and v2 in parallel for 3 months\\n- Add deprecation warnings to v1 responses\\n- Document migration path\\n\\n## Dependencies\\n- Issue #1 (Refactor architecture)\\n\\n## Effort\\n1 week\\n\\n## Phase\\nPhase 1 - Critical\\n\\n## Reference\\nSee ARCHITECTURE_REVIEW.md - Issue #7" \
    "\"critical\", \"backend\", \"api\", \"breaking-change\"" \
    ""

echo ""
echo -e "${GREEN}Phase 1 Issues Created (7 issues)${NC}"
echo ""
echo "Run this script or manually create issues using the GitHub web interface."
echo "Copy the issue content from above for each issue."
