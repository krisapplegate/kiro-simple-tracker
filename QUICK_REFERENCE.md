# Location Tracker - Quick Reference

## 🚀 Getting Started

```bash
# Clone and start
git clone <repo-url>
cd location-tracker
./docker-start.sh dev

# Access application
open http://localhost:3000
```

**Demo Login:** `admin@demo.com` / `password`

## 🐳 Docker Commands

```bash
./docker-start.sh dev      # Start development
./docker-start.sh prod     # Start production  
./docker-start.sh stop     # Stop all containers
./docker-start.sh logs     # View logs
./docker-start.sh health   # Check health
./docker-start.sh db       # Database shell
./docker-start.sh migrate  # Run database migrations
./docker-start.sh backup   # Backup database
./docker-start.sh clean    # Clean everything (⚠️ removes data)
```

## 🗄️ Database Management

```bash
# Statistics and info
node database/manage.js stats
node database/manage.js listUsers
node database/manage.js listObjects
node database/manage.js listTenants

# User management
node database/manage.js createUser user@example.com password123 user 1
node database/manage.js deleteUser user@example.com

# Object management
node database/manage.js listObjects
node database/manage.js deleteObject 5

# Tenant management  
node database/manage.js createTenant "Company Name"

# Database operations
node database/manage.js backup
node database/manage.js reset  # ⚠️ Removes all data
```

## 🔧 Development

```bash
# Manual start (without Docker)
npm install
npm run dev

# Individual services
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 3001

# Build for production
npm run build
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/validate` - Validate token

### Objects
- `GET /api/objects` - List objects (with filters)
- `POST /api/objects` - Create object
- `DELETE /api/objects/:id` - Delete object (owner/admin only)
- `GET /api/objects/types` - Get existing object types
- `GET /api/objects/tags` - Get existing tags
- `GET /api/objects/:id/locations` - Location history

### Health
- `GET /api/health` - Application health

## 🔍 Troubleshooting

```bash
# Check status
docker-compose ps
./docker-start.sh health

# View logs
./docker-start.sh logs
docker-compose logs backend
docker-compose logs database

# Reset everything
./docker-start.sh clean
./docker-start.sh dev

# Kill port conflicts
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

## 📊 Monitoring

```bash
# Container resources
docker stats

# Database connections
./docker-start.sh db
\x
SELECT * FROM pg_stat_activity;

# Application health
curl http://localhost:3001/api/health | jq
```

## 🔐 Security

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)

# Environment setup
cp .env.example .env
# Edit .env with your values
```

## 📁 Project Structure

```
├── src/                    # React frontend
├── backend/               # Node.js API
│   ├── server.js         # Main server
│   ├── database.js       # DB connection
│   └── models/           # Data models
├── database/             # DB setup
│   ├── init.sql         # Schema
│   └── manage.js        # Management CLI
├── docker-compose.yml    # Development
├── docker-compose.prod.yml # Production
└── docker-start.sh      # Helper script
```

## 🌍 Environment Variables

```bash
# Backend
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3001

# Database  
DB_HOST=localhost
DB_PORT=5432
DB_NAME=location_tracker
DB_USER=tracker_user
DB_PASSWORD=tracker_password

# Frontend
VITE_API_URL=http://localhost:3001
```

## 📱 Usage

1. **Login** with demo credentials
2. **Click map** to create objects
3. **Choose from existing types** or create custom types
4. **Use sidebar** to filter objects
5. **Click objects** to view/delete details
6. **Delete objects** you created (admins can delete any)
7. **Real-time updates** via WebSocket

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | `./docker-start.sh stop` |
| Database error | `./docker-start.sh health` |
| "created_by column does not exist" | `./docker-start.sh migrate` |
| Can't create objects | Check browser console |
| Authentication failed | Clear localStorage |
| Map not loading | Check internet connection |

## 📞 Support

1. Check logs: `./docker-start.sh logs`
2. Check health: `./docker-start.sh health`  
3. Reset app: `./docker-start.sh clean && ./docker-start.sh dev`
4. Check documentation: `README.md`, `DOCKER.md`, `SETUP.md`