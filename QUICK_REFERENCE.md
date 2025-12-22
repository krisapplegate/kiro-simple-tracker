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

**Demo Login:** `admin@demo.com` / `password` (Super Administrator)

## 🔐 RBAC System

### Default Roles & Permissions
- **Super Admin** (32 permissions): Full system access
- **Admin** (31 permissions): Full management except system admin
- **Manager** (16 permissions): Team and object oversight  
- **Operator** (12 permissions): Object and type management
- **Viewer** (7 permissions): Read-only access
- **User** (6 permissions): Basic object access for own objects

### Quick RBAC Commands
```bash
# Test user permissions
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Check permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# List roles
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq

# List groups  
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/groups | jq
```

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

## 🧪 Testing Commands

```bash
./docker-start.sh test-setup   # Setup test environment (one-time)
./docker-start.sh test         # Run all tests
./docker-start.sh test-unit    # Unit tests only
./docker-start.sh test-api     # API integration tests
./docker-start.sh test-ui      # UI tests with Playwright
./docker-start.sh test-rbac    # RBAC-specific tests
./docker-start.sh test-cleanup # Cleanup test environment
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
- `GET /api/objects` - List objects (requires `objects.read`)
- `POST /api/objects` - Create object (requires `objects.create`)
- `PUT /api/objects/:id` - Update object (requires `objects.update` + ownership)
- `DELETE /api/objects/:id` - Delete object (requires `objects.delete` + ownership)
- `GET /api/objects/types` - Get existing object types with usage counts
- `GET /api/objects/tags` - Get existing tags with usage counts
- `GET /api/objects/:id/locations` - Location history

### RBAC Management
- `GET /api/rbac/roles` - List roles (requires `roles.read`)
- `POST /api/rbac/roles` - Create role (requires `roles.create`)
- `GET /api/rbac/permissions` - List permissions (requires `roles.read`)
- `GET /api/rbac/groups` - List groups (requires `groups.read`)
- `POST /api/rbac/groups` - Create group (requires `groups.create`)
- `POST /api/rbac/users/:id/roles` - Assign role (requires `users.manage`)
- `GET /api/rbac/users/:id` - Get user RBAC info (requires `users.manage`)

### Type Configurations
- `GET /api/object-type-configs` - Get emoji configs (requires `types.read`)
- `POST /api/object-type-configs` - Create/update config (requires `types.create`)
- `DELETE /api/object-type-configs/:type` - Delete config (requires `types.delete`)

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

1. **Login** with demo credentials (`admin@demo.com` / `password` - Super Administrator)
2. **Click map** to create objects at specific locations (requires `objects.create`)
3. **Choose from existing types** or create custom types with emoji icons (requires `types.create`)
4. **Use sidebar** to filter objects by type, tags, or time range
5. **Click objects on map** to see enhanced tooltips with:
   - Color-coded status badges (active/warning/critical)
   - Object details (type, description, tags, last updated)
   - Action buttons (View Details, Edit, Delete - permission-based)
6. **Use ObjectDrawer** for detailed view and management
7. **Delete objects** you created or have `objects.manage` permission
8. **Real-time updates** via WebSocket for live synchronization
9. **Edit objects** directly from map tooltips or ObjectDrawer (requires `objects.update`)
10. **Access Admin Panel** via shield icon in navbar (requires admin permissions)
11. **Manage users and roles** in Admin Panel at `/admin`:
    - **User Management**: Create users, assign roles, search and filter
    - **Role Management**: Create custom roles with specific permissions
    - **Group Management**: Organize users into groups for easier management
    - **Permission Overview**: View all permissions and their usage across roles
12. **Test RBAC system** with different user roles and permission levels

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | `./docker-start.sh stop` |
| Database error | `./docker-start.sh health` |
| "created_by column does not exist" | `./docker-start.sh migrate` |
| Can't create objects | Check `objects.create` permission, try map click or + button |
| Authentication failed | Clear localStorage and re-login |
| Map not loading | Check internet connection for tiles |
| ObjectDrawer not visible | Check for z-index issues, should appear on right |
| Edit/Delete buttons missing | Check user permissions and object ownership |
| Map tooltips not working | Click objects on map to see enhanced popups |
| Access denied errors | Check user roles with `/api/rbac/users/:id` |
| Permission errors | Verify user has required permission for action |
| RBAC not working | Check if user has proper role assignments |

## 📞 Support

1. Check logs: `./docker-start.sh logs`
2. Check health: `./docker-start.sh health`  
3. Reset app: `./docker-start.sh clean && ./docker-start.sh dev`
4. Check documentation: `README.md`, `DOCKER.md`, `SETUP.md`