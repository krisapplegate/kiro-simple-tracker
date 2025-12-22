# Docker Setup for Location Tracker

This project includes Docker configurations for both development and production environments.

## Development Setup

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Quick Start

1. **Development Mode** (with hot reload):
```bash
docker-compose up
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001
- PostgreSQL database on port 5432

### Individual Services

Start only the backend:
```bash
docker-compose up backend
```

Start only the frontend:
```bash
docker-compose up frontend
```

## Production Setup

### Build and Run Production Containers

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build

# Run in background
docker-compose -f docker-compose.prod.yml up -d
```

Production setup includes:
- Nginx serving the built frontend on port 80
- Backend API on port 3001
- PostgreSQL database with persistent storage
- Optimized builds with security headers

### Environment Variables

Create a `.env` file for production:
```bash
JWT_SECRET=your-very-secure-secret-key-here
DB_PASSWORD=your-secure-database-password
NODE_ENV=production
```

## Container Details

### Frontend Container
- **Development**: Vite dev server with hot reload and React Fast Refresh
- **Production**: Nginx serving built static files with optimized assets
- **Port**: 3000 (dev) / 80 (prod)
- **Features**: Enhanced map tooltips, real-time updates, responsive design

### Backend Container
- **Development**: Nodemon with auto-restart on file changes
- **Production**: Node.js production server with PM2 process management
- **Port**: 3001
- **Database**: PostgreSQL connection with connection pooling
- **Features**: JWT authentication, RBAC system, WebSocket support, permission-based APIs
- **RBAC**: 32 granular permissions across 6 resources with role-based access control

### Database Container
- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432
- **Storage**: Persistent volumes for data
- **Initialization**: Automatic schema setup with RBAC system
- **Features**: Multi-tenant isolation, role-based permissions, audit trails

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop all containers
docker-compose down

# Rebuild containers
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v

# Shell into backend container
docker-compose exec backend sh

# Shell into frontend container
docker-compose exec frontend sh

# Shell into database container
docker-compose exec database psql -U tracker_user -d location_tracker

# Run database management commands
node database/manage.js stats
node database/manage.js listUsers
node database/manage.js createUser user@example.com password123

# Test RBAC system
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Check user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# List roles and permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq
```

## Network Configuration

Both containers run on the same Docker network and can communicate:
- Frontend → Backend: `http://backend:3001`
- External access: `http://localhost:3000` (frontend), `http://localhost:3001` (backend)

## Volume Mounts

Development mode includes volume mounts for:
- Source code hot reloading
- Configuration files
- Node modules persistence

## Security Notes

For production deployment:
1. Change the default JWT_SECRET
2. Use environment variables for sensitive data
3. Consider using Docker secrets for production
4. Review nginx security headers in `nginx.conf`
5. Use HTTPS in production with proper SSL certificates

## Troubleshooting

### Port Conflicts
If ports are in use, modify the port mappings in `docker-compose.yml`:
```yaml
ports:
  - "3002:3000"  # Use port 3002 instead of 3000
  - "3003:3001"  # Use port 3003 instead of 3001
  - "5433:5432"  # Use port 5433 instead of 5432
```

### Database Issues
```bash
# Check database container status
docker-compose ps database

# View database logs
docker-compose logs database

# Test database connection
./docker-start.sh health

# Access database shell
./docker-start.sh db

# Reset database (⚠️ removes all data)
./docker-start.sh clean
```

### Container Issues
```bash
# Check all container status
docker-compose ps

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs database

# Restart specific service
docker-compose restart backend

# Rebuild containers
docker-compose up --build
```

### Application Issues
```bash
# Test API endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/objects

# Test RBAC endpoints (requires authentication)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq

# Check WebSocket connection
# Look for "WebSocket connected" in browser console

# Test object creation (requires objects.create permission)
# Click on map or use + button

# Check user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# Verify RBAC system
node database/manage.js listUsers
```

### Permission Issues
On Linux/macOS, you might need to adjust file permissions:
```bash
sudo chown -R $USER:$USER .
```

### Data Persistence Issues
```bash
# Check volumes
docker volume ls

# Inspect volume
docker volume inspect simple-tracker_postgres_data

# Remove volumes (⚠️ removes all data)
docker-compose down -v
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Clean up unused resources
docker system prune

# Check disk space
docker system df
```