# Location Tracker - Setup & Testing Guide

Complete guide for installation, testing, and deployment of the multi-tenant location tracking application with RBAC, camera image generation, and admin workspace management.

## 📋 Quick Navigation

- [🚀 Quick Start](#-quick-start)
- [🧪 Testing](#-testing)
- [🏗️ Advanced Features](#️-advanced-features)
- [🔧 Development](#-development)
- [🚀 Production](#-production)
- [🔍 Troubleshooting](#-troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Installation & Setup

```bash
# Clone and start
git clone <repository-url>
cd location-tracker
./docker-start.sh dev

# Apply database migrations (one-time setup)
docker cp database/migrate_add_images.sql simple-tracker-database-1:/tmp/migrate_add_images.sql
docker cp database/migrate_add_cascade_deletes.sql simple-tracker-database-1:/tmp/migrate_add_cascade_deletes.sql
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_images.sql
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_cascade_deletes.sql

# Access application
open http://localhost:3000
```

**Demo Login**: `admin@demo.com` / `password` (Super Administrator)

### Key URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

## 🧪 Testing

### Automated Testing

```bash
# Complete test suite
./docker-start.sh test-setup  # One-time setup
./docker-start.sh test        # Run all tests
./docker-start.sh test-cleanup # Cleanup

# Individual test suites
./docker-start.sh test-unit      # Unit tests (63 tests)
./docker-start.sh test-api       # API integration (25 tests)
./docker-start.sh test-ui        # UI tests (30+ tests)
./docker-start.sh test-rbac      # RBAC-specific tests
./docker-start.sh test-isolation # Tenant isolation tests
```

### Manual API Testing

```bash
# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Test basic functionality
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/objects | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'
```

## 🏗️ Advanced Features

### 📸 Camera Image Generation

The simulator generates realistic camera-like images with location and time-based variations.

#### Quick Test
```bash
# Build simulator
cd simulator && ./run-simulator.sh build

# Test with images
./run-simulator.sh run --name "Camera Test" --images --imageInterval 1 --verbose
```

#### Advanced Scenarios
```bash
# NYC Security Camera
docker run --rm --network simple-tracker_default location-simulator \
  --name "NYC Security Camera" --objectType "security-cam" \
  --apiUrl "http://backend:3001" --includeImages true --imageInterval 2 \
  --pattern street --centerLat 40.7589 --centerLng -73.9851

# Multi-simulator demo
./run-simulator.sh multi
```

#### Image Features
- **Realistic Rendering**: Day/night lighting, weather effects, urban/suburban scenes
- **Camera Overlay**: Timestamp, GPS coordinates, object type
- **Object Storage**: MinIO integration with public URLs
- **Fallback Support**: SVG placeholders when canvas unavailable

### 🏢 Admin Workspace Management

Super administrators can manage all workspaces and objects across the system.

#### Access Admin Panel
1. Login as super admin (`admin@demo.com`)
2. Navigate to Admin → Workspaces tab
3. View/manage all workspaces and objects
4. Delete individual objects or entire workspaces (hierarchical)

#### API Testing
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# View all workspaces with statistics
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/tenants | jq

# View all objects across workspaces
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/admin/objects | jq

# Delete workspace (cascades to all data)
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/tenants/{workspaceId}
```

#### Workspace Management Features
- **Hierarchical View**: Expandable workspace display with contained objects
- **Statistics**: Real-time user, object, and location counts
- **Cascading Deletion**: Workspace deletion removes ALL associated data
- **Permission-Based**: Only super admins (`system.admin`) can access
- **Protection**: Default workspace (ID: 1) cannot be deleted

### 🔐 RBAC System Testing

#### Permission Levels
- **Super Admin** (`system.admin`): Full system access, workspace management
- **Admin** (`users.manage`, `roles.manage`): Workspace-level administration
- **Manager**: Object and user management within workspace
- **Operator**: Object management only
- **User**: Basic object access
- **Viewer**: Read-only access

#### Test Multi-User Scenarios
```bash
# Create test users
node database/manage.js createUser viewer@test.com password123 user 1
node database/manage.js createUser operator@test.com password123 user 1

# Test permission enforcement
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"viewer@test.com","password":"password123"}' | jq -r '.token')

# Should work (read permission)
curl -H "Authorization: Bearer $VIEWER_TOKEN" http://localhost:3001/api/objects

# Should fail (no create permission)
curl -X POST -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"vehicle","lat":37.7749,"lng":-122.4194}' \
  http://localhost:3001/api/objects
```

## 🔧 Development

### Manual Installation
```bash
# Prerequisites: Node.js 18+, PostgreSQL 15+
npm install
cp .env.example .env

# Database setup
sudo -u postgres createuser -P tracker_user
sudo -u postgres createdb -O tracker_user location_tracker
psql -h localhost -U tracker_user -d location_tracker -f database/init.sql

# Start development
npm run dev
```

### Database Management
```bash
# Docker helper commands
./docker-start.sh db          # Access database shell
./docker-start.sh health      # Check application health
./docker-start.sh backup      # Create backup
./docker-start.sh logs        # View logs

# Management CLI
node database/manage.js stats
node database/manage.js listUsers
node database/manage.js createUser user@example.com password123 user 1
```

### Simulator Configuration
```bash
# Basic options
--name "Object Name"           # Display name
--objectType "vehicle"         # Type: vehicle, drone, security-cam, pedestrian
--updateInterval 5000          # Update frequency (ms)
--verbose true                 # Detailed logging

# Movement patterns
--pattern random|circle|square|street
--centerLat 40.7128 --centerLng -74.0060
--radius 0.01 --speed 0.0001

# Camera features
--includeImages true --imageInterval 3
```

## 🚀 Production

### Docker Production Deployment
```bash
# Generate secure environment
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)
NODE_ENV=production
EOF

# Deploy
./docker-start.sh prod
./docker-start.sh health
```

### Security Checklist
- [ ] Strong JWT secrets and database passwords
- [ ] HTTPS enabled with valid certificates
- [ ] Environment variables for sensitive data
- [ ] Firewall rules configured
- [ ] Database SSL connections enabled
- [ ] Regular security updates scheduled

## 🔍 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
docker info                    # Check Docker status
lsof -i :3000 :3001 :5432     # Check port conflicts
./docker-start.sh logs        # View detailed logs
./docker-start.sh clean && ./docker-start.sh dev  # Reset everything
```

#### Database Issues
```bash
./docker-start.sh health       # Check database status
docker-compose logs database   # View database logs
./docker-start.sh db          # Access database shell
```

#### Permission Issues
```bash
# Check user permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq
```

#### Test Failures
```bash
./docker-start.sh dev         # Ensure app is running
curl http://localhost:3001/api/health  # Check backend
./docker-start.sh test-cleanup && ./docker-start.sh test-setup  # Reset tests
```

### Debug Mode
```bash
DEBUG=app:* npm run dev:backend     # Backend debug logging
DB_DEBUG=true npm run dev:backend   # Database query logging
```

### Performance Monitoring
```bash
docker stats                   # Container resource usage
./docker-start.sh db -c "SELECT * FROM pg_stat_activity;"  # Database connections
watch -n 5 './docker-start.sh health'  # Continuous health monitoring
```

## 📊 System Architecture

### Components
- **Frontend**: React with Vite, TailwindCSS, Leaflet maps
- **Backend**: Node.js/Express with JWT authentication, RBAC
- **Database**: PostgreSQL with multi-tenant architecture
- **Object Storage**: MinIO for camera images
- **Simulator**: Docker-based location/image generator

### Key Features
- **Multi-Tenant**: Complete workspace isolation
- **RBAC**: Role-based access control with 32 permissions
- **Real-Time**: WebSocket updates for live tracking
- **Camera Images**: AI-generated realistic camera feeds
- **Admin Panel**: System-wide workspace management
- **Testing**: Comprehensive unit, integration, and UI tests

---

**Need Help?** Check the troubleshooting section or review the test examples for common usage patterns.