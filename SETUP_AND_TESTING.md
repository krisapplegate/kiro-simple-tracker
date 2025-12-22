# Setup and Testing Guide

This comprehensive guide covers installation, configuration, testing, and troubleshooting for the Location Tracker application.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Testing](#testing)
- [Database Management](#database-management)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd location-tracker

# Start application
./docker-start.sh dev

# Access application
open http://localhost:3000
```

**Demo Login**: `admin@demo.com` / `password` (Super Administrator)

## 🔧 Manual Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Steps

1. **Install dependencies:**
```bash
npm install
```

2. **Set up PostgreSQL database:**
```bash
# Create database and user
sudo -u postgres createuser -P tracker_user
sudo -u postgres createdb -O tracker_user location_tracker

# Initialize schema
psql -h localhost -U tracker_user -d location_tracker -f database/init.sql
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Start the application:**
```bash
npm run dev
```

## 🧪 Testing

### Quick Testing with Docker

```bash
# One-time setup (installs dependencies, browsers, starts app)
./docker-start.sh test-setup

# Run all tests
./docker-start.sh test

# Run specific test suites
./docker-start.sh test-unit    # Unit tests only
./docker-start.sh test-api     # API integration tests
./docker-start.sh test-ui      # UI tests with Playwright
./docker-start.sh test-rbac    # RBAC-specific tests
./docker-start.sh test-isolation # Tenant isolation tests

# Cleanup when done
./docker-start.sh test-cleanup
```

### Manual Testing Setup

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8 @playwright/test supertest

# Install Playwright browsers
npx playwright install

# Start application
./docker-start.sh dev

# Run tests
npm run test:unit          # Unit tests
npm run test:api           # API tests
npm run test:ui            # UI tests
```

### Test Categories

#### Unit Tests (63 tests)
- **RBAC Service**: Permission checking, role management, group management
- **User Model**: Authentication, password security, user management
- **Auth Middleware**: Tenant isolation, permission loading

#### Integration Tests (25 tests)
- **RBAC API**: All RBAC endpoints, permission enforcement
- **Workspace Creation**: Multi-tenant functionality
- **Tenant Isolation**: Complete data separation between workspaces

#### UI Tests (30+ tests)
- **Admin Panel**: Access control, user management interface
- **Role Management**: Create roles, assign permissions
- **Group Management**: Create groups, manage members

### RBAC Testing

#### Test User Permissions
```bash
# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Check user permissions (should show all 32 permissions)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# List all roles
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq
```

#### Test Permission Enforcement
```bash
# Test objects.create permission
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Object",
    "type": "vehicle",
    "lat": 37.7749,
    "lng": -122.4194
  }' | jq

# Test role management (requires roles.read)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq
```

#### Test Multi-User Scenarios
```bash
# Create test users with different roles
node database/manage.js createUser viewer@test.com password123 user 1
node database/manage.js createUser operator@test.com password123 user 1

# Test viewer permissions (should be read-only)
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"password123"}' | jq -r '.token')

# Should work (read permission)
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/objects | jq

# Should fail (no create permission)
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "vehicle", "lat": 37.7749, "lng": -122.4194}' | jq
```

### Tenant Isolation Testing

```bash
# Test tenant isolation with objects
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Create objects in different workspaces
curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"name": "Object in Workspace 1", "type": "test", "lat": 37.7749, "lng": -122.4194}' | jq

curl -s -X POST http://localhost:3001/api/objects \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"name": "Object in Workspace 2", "type": "test", "lat": 37.7849, "lng": -122.4094}' | jq

# Verify objects are isolated
echo "Objects in workspace 1:"
curl -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 1" http://localhost:3001/api/objects | jq

echo "Objects in workspace 2:"
curl -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: 2" http://localhost:3001/api/objects | jq
```

## 🗄️ Database Management

### Using Docker Helper Script
```bash
# Access database shell
./docker-start.sh db

# Check application health
./docker-start.sh health

# Create database backup
./docker-start.sh backup

# Restore from backup
./docker-start.sh restore backup_20231212_143022.sql
```

### Using Management CLI
```bash
# Show database statistics
node database/manage.js stats

# User management
node database/manage.js listUsers
node database/manage.js createUser user@example.com password123 user 1
node database/manage.js deleteUser user@example.com

# Object management
node database/manage.js listObjects
node database/manage.js deleteObject 5

# Tenant management
node database/manage.js createTenant "Company Name"
```

### Direct Database Access
```bash
# Connect to database (Docker)
docker-compose exec database psql -U tracker_user -d location_tracker

# Connect to database (Local)
psql -h localhost -U tracker_user -d location_tracker

# Useful queries
\dt                                    # List tables
SELECT * FROM users;                   # List users
SELECT * FROM roles;                   # List roles
SELECT * FROM permissions;             # List permissions
SELECT * FROM objects;                 # List objects
```

## 🚀 Production Deployment

### Docker Production Setup

1. **Create production environment file:**
```bash
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)
NODE_ENV=production
EOF
```

2. **Deploy with Docker Compose:**
```bash
./docker-start.sh prod
```

3. **Verify deployment:**
```bash
./docker-start.sh health
```

### Cloud Deployment

#### Environment Variables for Production
```bash
JWT_SECRET=your-secure-secret
DB_PASSWORD=your-secure-password
NODE_ENV=production
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=location_tracker
DB_USER=tracker_user
```

#### Security Considerations
- Use strong, randomly generated JWT secrets
- Enable HTTPS in production
- Use environment variables for sensitive data
- Configure proper firewall rules
- Enable database SSL connections
- Regular security updates

## 🔍 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :3000
lsof -i :3001
lsof -i :5432

# View detailed logs
./docker-start.sh logs

# Reset everything
./docker-start.sh clean
./docker-start.sh dev
```

#### Database Issues
```bash
# Check database status
./docker-start.sh health

# View database logs
docker-compose logs database

# Access database shell
./docker-start.sh db

# Check database connections
\x
SELECT * FROM pg_stat_activity;
```

#### Permission Issues
```bash
# Check user roles and permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Validate user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq

# Check specific permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/objects

# List user's roles
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/users/1
```

#### Authentication Issues
```bash
# Clear browser storage
# In browser console: localStorage.clear()

# Check JWT secret is set
echo $JWT_SECRET

# Verify user exists
node database/manage.js listUsers
```

#### Test Failures
```bash
# Ensure application is running
./docker-start.sh dev
curl http://localhost:3001/api/health

# Check frontend is accessible
curl http://localhost:3000

# Reinstall test dependencies
./docker-start.sh test-cleanup
./docker-start.sh test-setup
```

### Performance Issues
```bash
# Check container resource usage
docker stats

# Monitor database connections
./docker-start.sh db
SELECT * FROM pg_stat_activity;

# Check application health
watch -n 5 './docker-start.sh health'
```

### Debug Mode

Enable debug logging:
```bash
# Backend debug
DEBUG=app:* npm run dev:backend

# Database query logging
DB_DEBUG=true npm run dev:backend
```

## 📊 Monitoring and Health Checks

### Application Health
```bash
# Check all services
./docker-start.sh health

# Individual service health
curl http://localhost:3001/api/health  # Backend
curl http://localhost:3000             # Frontend
```

### Database Health
```bash
# Connection test
./docker-start.sh db -c "SELECT 1;"

# Performance monitoring
./docker-start.sh db -c "SELECT * FROM pg_stat_database WHERE datname = 'location_tracker';"
```

### Container Monitoring
```bash
# Resource usage
docker stats

# Container logs
docker-compose logs -f backend
docker-compose logs -f database
```

## 🎯 Best Practices

### Development Workflow
1. Run `./docker-start.sh test-setup` once per development session
2. Use `./docker-start.sh test-unit` for quick feedback during development
3. Run `./docker-start.sh test-api` before committing changes
4. Run `./docker-start.sh test` before creating pull requests
5. Use `./docker-start.sh test-cleanup` to free up resources when done

### Security Best Practices
1. Change default credentials in production
2. Use environment variables for sensitive data
3. Enable HTTPS and secure headers
4. Regular security updates
5. Monitor access logs
6. Use strong passwords and JWT secrets

### Performance Optimization
1. Keep the application running during development
2. Use unit tests for rapid iteration
3. Run full test suite only before commits/deployments
4. Clean up regularly to free disk space
5. Monitor database performance
6. Use connection pooling for database

This comprehensive guide should help you set up, test, and maintain the Location Tracker application effectively.