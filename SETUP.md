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

4. **Login with demo credentials:**
- Email: `admin@demo.com`
- Password: `password`

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
# Create admin user
node database/manage.js createUser admin@company.com securepass admin 1

# Create regular user
node database/manage.js createUser user@company.com userpass user 1

# List all users
node database/manage.js listUsers
```

### Database Queries

```sql
-- Connect to database
\c location_tracker

-- View all tables
\dt

-- Check user count
SELECT COUNT(*) FROM users;

-- Check object count by type
SELECT type, COUNT(*) FROM objects GROUP BY type;

-- View recent location updates
SELECT o.name, lh.lat, lh.lng, lh.timestamp 
FROM location_history lh 
JOIN objects o ON lh.object_id = o.id 
ORDER BY lh.timestamp DESC 
LIMIT 10;
```

## Troubleshooting

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