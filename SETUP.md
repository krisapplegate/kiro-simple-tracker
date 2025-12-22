# Location Tracker Setup Guide

This guide provides step-by-step instructions for setting up the Location Tracker application in different environments.

## Table of Contents
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)
- [Production Deployment](#production-deployment)
- [Development Setup](#development-setup)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- Git

### Steps

1. **Clone the repository:**
```bash
git clone <repository-url>
cd location-tracker
```

2. **Start the application:**
```bash
./docker-start.sh dev
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database: PostgreSQL on port 5432

4. **Login and explore features:**
- Email: `admin@demo.com`
- Password: `password`
- Role: Super Administrator (full system access)
- Click on the map to create objects (requires `objects.create` permission)
- Use enhanced map tooltips for quick actions
- Try the sidebar filters and ObjectDrawer
- Test RBAC by checking user permissions: `/api/rbac/users/1`

That's it! The application is now running with a PostgreSQL database.

## Manual Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Steps

1. **Install Node.js dependencies:**
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
# Start backend
npm run dev:backend

# In another terminal, start frontend
npm run dev:frontend
```

## Production Deployment

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

#### Using Railway/Render/DigitalOcean

1. **Fork the repository**

2. **Set environment variables in your platform:**
```
JWT_SECRET=your-secure-secret
DB_PASSWORD=your-secure-password
NODE_ENV=production
```

3. **Deploy using docker-compose.prod.yml**

#### Using Kubernetes

1. **Create namespace:**
```bash
kubectl create namespace location-tracker
```

2. **Apply configurations:**
```bash
kubectl apply -f k8s/ -n location-tracker
```

## Development Setup

### Hot Reload Development

1. **Start with Docker (recommended):**
```bash
./docker-start.sh dev
```

2. **Or start manually:**
```bash
# Terminal 1: Database
docker-compose up database

# Terminal 2: Backend
npm run dev:backend

# Terminal 3: Frontend
npm run dev:frontend
```

### Development Tools

```bash
# Database management
node database/manage.js stats
node database/manage.js listUsers
node database/manage.js createUser test@example.com password123

# Health checks
curl http://localhost:3001/api/health

# Database shell
./docker-start.sh db
```

## Database Management

### Backup and Restore

```bash
# Create backup
./docker-start.sh backup

# Restore from backup
./docker-start.sh restore backup_20231212_143022.sql
```

### User Management

```bash
# Create admin user (Super Administrator role)
node database/manage.js createUser admin@company.com securepass admin 1

# Create regular user (User role)
node database/manage.js createUser user@company.com userpass user 1

# List all users with roles
node database/manage.js listUsers

# Test RBAC system
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"securepass"}' | jq -r '.token')

# Check user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# List all roles and their permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq
```

### Database Queries

```sql
-- Connect to database
\c location_tracker

-- View all tables (including RBAC tables)
\dt

-- Check user count and roles
SELECT u.email, u.role, r.display_name as primary_role 
FROM users u 
LEFT JOIN roles r ON u.primary_role_id = r.id;

-- Check object count by type with creators
SELECT o.type, COUNT(*) as count, u.email as creator
FROM objects o 
JOIN users u ON o.created_by = u.id 
GROUP BY o.type, u.email;

-- View user permissions
SELECT u.email, p.name as permission, p.display_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'admin@demo.com'
ORDER BY p.resource, p.action;

-- View recent location updates
SELECT o.name, lh.lat, lh.lng, lh.timestamp 
FROM location_history lh 
JOIN objects o ON lh.object_id = o.id 
ORDER BY lh.timestamp DESC 
LIMIT 10;
```

## Testing

### Quick Testing with Docker

The easiest way to run tests is using the Docker helper script:

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

# Cleanup when done
./docker-start.sh test-cleanup
```

### Manual Testing Setup

If you prefer to run tests manually:

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8 @playwright/test supertest jest

# Install Playwright browsers
npx playwright install

# Start application
./docker-start.sh dev

# Run tests
npm run test:unit          # Unit tests
npm run test:api           # API tests
npm run test:ui            # UI tests
```

### Test Development

```bash
# Run tests in watch mode during development
npm run test:unit:watch

# Run UI tests with browser visible for debugging
npm run test:ui:headed

# Debug UI tests with Playwright inspector
npm run test:ui:debug
```

For comprehensive testing documentation, see [TESTING.md](TESTING.md).

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:5432 | xargs kill -9

# Or use different ports in docker-compose.yml
```

#### Database Connection Failed
```bash
# Check database status
./docker-start.sh health

# View database logs
docker-compose logs database

# Reset database
./docker-start.sh clean
```

#### Frontend Not Loading
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend
```

#### Map Tooltips Not Working
```bash
# Check browser console for JavaScript errors
# Verify objects exist on map
node database/manage.js listObjects

# Check WebSocket connection
# Look for "WebSocket connected" in browser console
```

#### RBAC and Permission Issues
```bash
# Check user roles and permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Validate user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq

# Test specific permission
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/objects

# Check if user can access RBAC endpoints
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles

# List user's roles and groups
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/users/1
```

#### Object Permission Issues
```bash
# Check object ownership
node database/manage.js listObjects

# Verify user can create objects
# User needs 'objects.create' permission

# Verify user can delete objects  
# User needs 'objects.delete' permission + ownership OR 'objects.manage' permission

# Check object type permissions
# User needs 'types.read' to view, 'types.create' to add emoji configs
```

#### Authentication Issues
```bash
# Clear browser storage
# In browser console:
localStorage.clear()

# Check JWT secret is set
echo $JWT_SECRET

# Verify user exists
node database/manage.js listUsers
```

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# Backend debug
DEBUG=app:* npm run dev:backend

# Database query logging
DB_DEBUG=true npm run dev:backend
```

### Performance Monitoring

```bash
# Check container resource usage
docker stats

# Monitor database connections
./docker-start.sh db
\x
SELECT * FROM pg_stat_activity;

# Check application health
watch -n 5 './docker-start.sh health'
```

## Security Considerations

### Production Security

1. **Change default credentials:**
```bash
# Generate secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Generate secure database password
DB_PASSWORD=$(openssl rand -base64 16)
```

2. **Use HTTPS in production:**
- Configure SSL certificates
- Update VITE_API_URL to use https://
- Set secure cookie flags

3. **Database security:**
- Use strong passwords
- Limit database access
- Enable SSL connections
- Regular backups

4. **Network security:**
- Use firewalls
- Limit exposed ports
- Use VPN for database access

### Environment Variables

Never commit sensitive environment variables to version control:

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

## Support

### Getting Help

1. **Check logs:**
```bash
./docker-start.sh logs
```

2. **Check health:**
```bash
./docker-start.sh health
```

3. **Database diagnostics:**
```bash
node database/manage.js stats
```

4. **Reset everything:**
```bash
./docker-start.sh clean
./docker-start.sh dev
```

### Useful Commands Reference

```bash
# Docker management
./docker-start.sh dev          # Start development
./docker-start.sh prod         # Start production
./docker-start.sh stop         # Stop all containers
./docker-start.sh logs         # View logs
./docker-start.sh health       # Check health
./docker-start.sh db           # Database shell
./docker-start.sh backup       # Backup database
./docker-start.sh clean        # Clean everything

# Database management
node database/manage.js stats           # Show statistics
node database/manage.js listUsers       # List users
node database/manage.js listObjects     # List objects
node database/manage.js createUser      # Create user
node database/manage.js help            # Show help

# Development
npm run dev                    # Start both frontend and backend
npm run dev:frontend          # Start only frontend
npm run dev:backend           # Start only backend
npm run build                 # Build for production
```