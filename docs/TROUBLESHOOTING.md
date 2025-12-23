# Troubleshooting Guide

Common issues and solutions for Location Tracker.

## 🚨 Quick Fixes

### Application Won't Start
```bash
# Check Docker status
docker info

# Check port conflicts
lsof -i :3000 :3001 :5432 :9000

# View logs
./docker-start.sh logs

# Reset everything
./docker-start.sh clean && ./docker-start.sh dev
```

### Database Connection Issues
```bash
# Check database status
./docker-start.sh health

# View database logs
docker-compose logs database

# Access database shell
./docker-start.sh db

# Reset database
docker-compose down -v database
docker-compose up -d database
```

### Permission Denied Errors
```bash
# Check user permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/auth/validate | jq '.permissions'
```

## 🔍 Common Issues

### Frontend Issues

#### Page Won't Load
**Symptoms:** Blank page, loading spinner forever
**Causes:**
- Backend not running
- CORS issues
- JavaScript errors

**Solutions:**
```bash
# Check backend health
curl http://localhost:3001/api/health

# Check browser console for errors
# Open DevTools → Console

# Restart frontend
docker-compose restart frontend
```

#### Objects Not Appearing on Map
**Symptoms:** Map loads but no objects visible
**Causes:**
- Wrong workspace selected
- Filters hiding objects
- No objects created yet

**Solutions:**
1. Check workspace selector in navbar
2. Clear all filters in sidebar
3. Create test object by clicking map
4. Check browser console for API errors

#### Images Not Loading
**Symptoms:** Broken image icons, 404 errors
**Causes:**
- MinIO not running
- Image URLs incorrect
- CORS issues

**Solutions:**
```bash
# Check MinIO status
docker-compose ps minio

# Test MinIO access
curl http://localhost:9000/minio/health/live

# Restart MinIO
docker-compose restart minio
```

### Backend Issues

#### API Endpoints Return 500 Errors
**Symptoms:** Internal server errors on API calls
**Causes:**
- Database connection lost
- Missing environment variables
- Code errors

**Solutions:**
```bash
# Check backend logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep -E "(DB_|JWT_|MINIO_)"

# Restart backend
docker-compose restart backend
```

#### Authentication Failures
**Symptoms:** 401 Unauthorized errors
**Causes:**
- Invalid JWT token
- Token expired
- Wrong credentials

**Solutions:**
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}'

# Check JWT secret
echo $JWT_SECRET

# Reset admin password
node database/manage.js resetPassword admin@demo.com newpassword
```

#### Permission Denied (403 Errors)
**Symptoms:** Forbidden errors on API calls
**Causes:**
- Insufficient user permissions
- Wrong tenant context
- RBAC misconfiguration

**Solutions:**
```bash
# Check user role and permissions
node database/manage.js listUsers

# Grant admin permissions
node database/manage.js updateUserRole admin@demo.com admin

# Check RBAC configuration
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/rbac/roles
```

### Database Issues

#### Connection Refused
**Symptoms:** Database connection errors
**Causes:**
- PostgreSQL not running
- Wrong connection parameters
- Network issues

**Solutions:**
```bash
# Check PostgreSQL status
docker-compose ps database

# Test connection
docker exec simple-tracker-database-1 pg_isready -U tracker_user

# Check connection parameters
docker-compose exec database env | grep POSTGRES

# Restart database
docker-compose restart database
```

#### Migration Errors
**Symptoms:** Database schema errors
**Causes:**
- Missing migrations
- Migration conflicts
- Corrupted schema

**Solutions:**
```bash
# Check applied migrations
./docker-start.sh db -c "\dt"

# Apply missing migrations
docker cp database/migrate_add_images.sql simple-tracker-database-1:/tmp/
docker-compose exec database psql -U tracker_user -d location_tracker -f /tmp/migrate_add_images.sql

# Reset database (DESTRUCTIVE)
docker-compose down -v
./docker-start.sh dev
```

#### Performance Issues
**Symptoms:** Slow queries, timeouts
**Causes:**
- Missing indexes
- Large datasets
- Resource constraints

**Solutions:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX CONCURRENTLY idx_location_history_object_id ON location_history(object_id);

-- Analyze tables
ANALYZE objects;
ANALYZE location_history;
```

### MinIO Issues

#### Image Upload Failures
**Symptoms:** 500 errors on image upload
**Causes:**
- MinIO not accessible
- Bucket doesn't exist
- Permission issues

**Solutions:**
```bash
# Check MinIO logs
docker-compose logs minio

# Test MinIO connection
curl http://localhost:9000/minio/health/live

# Access MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin

# Restart MinIO
docker-compose restart minio
```

#### Images Not Accessible
**Symptoms:** 403 Forbidden on image URLs
**Causes:**
- Bucket policy issues
- CORS configuration
- Network problems

**Solutions:**
```bash
# Check bucket policy
docker exec simple-tracker-minio-1 mc policy get local/location-images

# Set public read policy
docker exec simple-tracker-minio-1 mc policy set public local/location-images

# Test image access
curl -I http://localhost:9000/location-images/test-image.jpg
```

### Simulator Issues

#### Simulator Won't Start
**Symptoms:** Simulator container exits immediately
**Causes:**
- Build failures
- Configuration errors
- Network issues

**Solutions:**
```bash
# Check simulator logs
docker logs location-simulator

# Rebuild simulator
cd simulator && ./run-simulator.sh build

# Test with verbose logging
./run-simulator.sh run --name "Test" --verbose
```

#### No Location Updates
**Symptoms:** Simulator runs but objects don't move
**Causes:**
- API connection issues
- Authentication problems
- Network connectivity

**Solutions:**
```bash
# Test API connectivity from simulator
docker run --rm --network simple-tracker_default curlimages/curl \
  curl http://backend:3001/api/health

# Check simulator authentication
# Verify API_URL in simulator configuration

# Test manual location update
curl -X PUT http://localhost:3001/api/objects/1/location \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":40.7128,"lng":-74.0060}'
```

#### Images Not Generated
**Symptoms:** Simulator moves objects but no images appear
**Causes:**
- Canvas/image generation issues
- MinIO upload failures
- Configuration problems

**Solutions:**
```bash
# Check if images are enabled
./run-simulator.sh run --name "Test" --includeImages true --imageInterval 1

# Check MinIO from simulator network
docker run --rm --network simple-tracker_default curlimages/curl \
  curl http://minio:9000/minio/health/live

# Test image generation manually
docker exec location-simulator node -e "
  const ImageGenerator = require('./src/ImageGenerator.js');
  const gen = new ImageGenerator();
  console.log('Image generation test:', gen.generateCameraImage(40.7128, -74.0060, new Date(), 'vehicle'));
"
```

## 🔧 Diagnostic Commands

### System Health Check
```bash
# Complete health check
./docker-start.sh health

# Individual service checks
curl http://localhost:3001/api/health                    # Backend
curl http://localhost:9000/minio/health/live            # MinIO
docker exec simple-tracker-database-1 pg_isready -U tracker_user  # Database
curl -I http://localhost:3000                           # Frontend
```

### Log Analysis
```bash
# View all logs
./docker-start.sh logs

# Follow logs in real-time
docker-compose logs -f

# Service-specific logs
docker-compose logs backend
docker-compose logs database
docker-compose logs minio
docker-compose logs frontend
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network connectivity
docker network ls
docker network inspect simple-tracker_default
```

### Database Diagnostics
```sql
-- Active connections
SELECT * FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes ORDER BY idx_scan DESC;
```

## 🚀 Performance Optimization

### Database Performance
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX CONCURRENTLY idx_location_history_object_id ON location_history(object_id);
CREATE INDEX CONCURRENTLY idx_images_tenant_id ON images(tenant_id);
CREATE INDEX CONCURRENTLY idx_location_history_timestamp ON location_history(timestamp);

-- Update statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE objects;
VACUUM ANALYZE location_history;
```

### Application Performance
```bash
# Increase container resources
docker-compose.yml:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

# Enable production optimizations
NODE_ENV=production
VITE_BUILD_OPTIMIZE=true
```

### Network Performance
```bash
# Use production Docker images
./docker-start.sh prod

# Enable compression
nginx.conf:
  gzip on;
  gzip_types text/plain application/json application/javascript text/css;
```

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Review the logs for error messages
3. Try the quick fixes above
4. Search existing GitHub issues

### Information to Include
- **Error messages**: Exact error text from logs
- **Steps to reproduce**: What you were doing when the error occurred
- **Environment**: Docker version, OS, browser
- **Configuration**: Relevant environment variables (redact secrets)
- **Logs**: Recent log entries from affected services

### Useful Commands for Bug Reports
```bash
# System information
docker version
docker-compose version
uname -a

# Service status
docker-compose ps
./docker-start.sh health

# Recent logs
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 database
```

### Contact Information
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/issues)
- **Documentation**: [docs/README.md](README.md)
- **API Reference**: [API_REFERENCE.md](API_REFERENCE.md)

---

**Related Documentation**:
- [Setup Guide](SETUP.md) - Installation and configuration
- [User Guide](USER_GUIDE.md) - End-user features
- [Admin Guide](ADMIN_GUIDE.md) - Administrative features