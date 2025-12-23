# Setup & Installation Guide

Complete guide for setting up the Location Tracker application in different environments.

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Docker & Docker Compose** (recommended)
- **Node.js 18+** (for local development)
- **PostgreSQL 15+** (if not using Docker)

### Option 1: Docker Setup (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd location-tracker

# 2. Start all services
./docker-start.sh dev

# 3. Apply database migrations (one-time)
docker cp database/migrate_add_images.sql simple-tracker-database-1:/tmp/
docker cp database/migrate_add_cascade_deletes.sql simple-tracker-database-1:/tmp/
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_images.sql
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_cascade_deletes.sql

# 4. Access the application
open http://localhost:3000
```

**Default Login**: `admin@demo.com` / `password`

### Option 2: Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Set up PostgreSQL database
createdb location_tracker
psql location_tracker < database/init.sql
psql location_tracker < database/migrate_add_created_by.sql
psql location_tracker < database/migrate_add_object_type_configs.sql
psql location_tracker < database/migrate_add_rbac.sql
psql location_tracker < database/migrate_add_images.sql
psql location_tracker < database/migrate_add_cascade_deletes.sql

# 4. Start services
npm run dev:backend &  # Backend on port 3001
npm run dev:frontend   # Frontend on port 3000
```

## 🔧 Detailed Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=development
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=location_tracker
DB_USER=tracker_user
DB_PASSWORD=tracker_password

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=location-images

# Frontend
VITE_API_URL=http://localhost:3001
```

### Database Setup

#### Using Docker (Recommended)
```bash
# Database is automatically set up with docker-compose
docker-compose up -d database
```

#### Manual PostgreSQL Setup
```bash
# 1. Install PostgreSQL 15+
# Ubuntu/Debian:
sudo apt update && sudo apt install postgresql-15

# macOS:
brew install postgresql@15

# 2. Create database and user
sudo -u postgres psql
CREATE DATABASE location_tracker;
CREATE USER tracker_user WITH PASSWORD 'tracker_password';
GRANT ALL PRIVILEGES ON DATABASE location_tracker TO tracker_user;
\q

# 3. Run migrations
psql -U tracker_user -d location_tracker -f database/init.sql
psql -U tracker_user -d location_tracker -f database/migrate_add_created_by.sql
psql -U tracker_user -d location_tracker -f database/migrate_add_object_type_configs.sql
psql -U tracker_user -d location_tracker -f database/migrate_add_rbac.sql
psql -U tracker_user -d location_tracker -f database/migrate_add_images.sql
psql -U tracker_user -d location_tracker -f database/migrate_add_cascade_deletes.sql
```

### MinIO Setup (Object Storage)

#### Using Docker (Recommended)
```bash
# MinIO is automatically set up with docker-compose
docker-compose up -d minio
```

#### Manual MinIO Setup
```bash
# 1. Download and install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# 2. Create data directory
mkdir -p ~/minio-data

# 3. Start MinIO server
minio server ~/minio-data --console-address ":9001"

# 4. Access MinIO Console at http://localhost:9001
# Default credentials: minioadmin / minioadmin
```

## 🐳 Docker Configuration

### Development Mode
```bash
./docker-start.sh dev
```
- Hot reloading enabled
- Development dependencies included
- Debug logging enabled

### Production Mode
```bash
./docker-start.sh prod
```
- Optimized builds
- Production dependencies only
- Minimal logging

### Custom Docker Compose
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    volumes:
      - ./custom-config:/app/config
  
  database:
    ports:
      - "5433:5432"  # Custom port mapping
```

## 🧪 Testing Setup

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
# Start test environment
./docker-start.sh test-setup

# Run integration tests
npm run test:integration
```

### UI Tests
```bash
# Install Playwright browsers
npx playwright install

# Run UI tests
npm run test:ui
```

## 🚗 Simulator Setup

### Quick Start
```bash
cd simulator
./run-simulator.sh multi  # Start all simulators
```

### Custom Simulation
```bash
# Build simulator image
./run-simulator.sh build

# Run specific simulators
./run-simulator.sh nyc        # NYC Taxi
./run-simulator.sh sf         # SF Delivery
./run-simulator.sh drone      # Security Drone
./run-simulator.sh pedestrian # Walking Person
```

## 🔍 Verification

### Health Checks
```bash
# Backend health
curl http://localhost:3001/api/health

# Database connection
docker exec simple-tracker-database-1 pg_isready -U tracker_user

# MinIO health
curl http://localhost:9000/minio/health/live
```

### Test Login
```bash
# Get authentication token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}'

# Test authenticated endpoint
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # or :3001, :5432, :9000

# Kill process
kill -9 PID
```

#### Database Connection Failed
```bash
# Check database status
docker logs simple-tracker-database-1

# Reset database
docker-compose down -v
docker-compose up -d database
# Re-run migrations
```

#### MinIO Access Denied
```bash
# Check MinIO logs
docker logs simple-tracker-minio-1

# Reset MinIO data
docker-compose down -v
docker-compose up -d minio
```

#### Frontend Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

### Performance Optimization

#### Database
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX CONCURRENTLY idx_location_history_object_id ON location_history(object_id);
CREATE INDEX CONCURRENTLY idx_images_object_id ON images(object_id);
```

#### MinIO
```bash
# Increase MinIO memory limit
docker-compose.yml:
  minio:
    environment:
      - MINIO_CACHE_SIZE=1GB
```

## 📊 Monitoring

### Application Logs
```bash
# Backend logs
docker logs -f simple-tracker-backend-1

# Database logs
docker logs -f simple-tracker-database-1

# All services
docker-compose logs -f
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Database Migrations
```bash
# Apply new migrations
docker cp database/new_migration.sql simple-tracker-database-1:/tmp/
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/new_migration.sql
```

### Backup & Restore
```bash
# Backup database
./docker-start.sh backup

# Restore database
docker exec -i simple-tracker-database-1 psql -U tracker_user -d location_tracker < backup.sql
```

---

**Next Steps**: 
- [User Guide](USER_GUIDE.md) - Learn how to use the application
- [Development Guide](DEVELOPMENT.md) - Set up development environment
- [API Reference](API_REFERENCE.md) - Explore the API