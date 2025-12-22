# Location Tracker

A multi-tenant location tracking application with comprehensive role-based access control (RBAC) and real-time updates.

## ✨ Features

- **Multi-Tenant Architecture**: Complete workspace isolation with automatic RBAC initialization
- **Real-Time Location Tracking**: Live position updates with WebSocket integration
- **Advanced RBAC System**: 6 roles, 32 granular permissions across 6 resources
- **Interactive Map Interface**: Leaflet-based maps with enhanced tooltips and custom markers
- **Workspace Management**: Create and switch between isolated workspaces
- **Admin Panel**: Complete UI for managing users, roles, groups, and permissions
- **Object Management**: Create, edit, delete tracked objects with permission-based access
- **Location History**: Track and visualize historical movement data
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone and start
git clone <repository-url>
cd location-tracker
./docker-start.sh dev

# Access application
open http://localhost:3000
```

**Demo Login**: `admin@demo.com` / `password` (Super Administrator)

### Manual Setup

```bash
# Install dependencies
npm install

# Set up PostgreSQL database
createdb location_tracker
psql location_tracker < database/init.sql

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start application
npm run dev
```

## 🔐 RBAC System

### Default Roles & Permissions
- **Super Admin** (32 permissions): Full system access
- **Admin** (31 permissions): Full management except system admin
- **Manager** (16 permissions): Team and object oversight  
- **Operator** (12 permissions): Object and type management
- **Viewer** (7 permissions): Read-only access
- **User** (6 permissions): Basic object access for own objects

### Admin Panel Access
Navigate to `/admin` or click the shield icon in the navbar (requires admin permissions).

## 🧪 Testing

```bash
# Setup test environment (one-time)
./docker-start.sh test-setup

# Run all tests
./docker-start.sh test

# Run specific test suites
./docker-start.sh test-unit    # Unit tests
./docker-start.sh test-api     # API integration tests
./docker-start.sh test-ui      # UI tests with Playwright
./docker-start.sh test-rbac    # RBAC-specific tests
```

## 🐳 Docker Commands

```bash
./docker-start.sh dev      # Start development
./docker-start.sh prod     # Start production  
./docker-start.sh stop     # Stop all containers
./docker-start.sh logs     # View logs
./docker-start.sh health   # Check health
./docker-start.sh db       # Database shell
./docker-start.sh backup   # Backup database
./docker-start.sh clean    # Clean everything (⚠️ removes data)
```

## 🗄️ Database Management

```bash
# Statistics and user management
node database/manage.js stats
node database/manage.js listUsers
node database/manage.js createUser user@example.com password123 user 1

# Object and tenant management
node database/manage.js listObjects
node database/manage.js createTenant "Company Name"
```

## 🌐 Key API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT token

### Objects
- `GET /api/objects` - List objects (requires `objects.read`)
- `POST /api/objects` - Create object (requires `objects.create`)
- `DELETE /api/objects/:id` - Delete object (requires `objects.delete` + ownership)

### RBAC Management
- `GET /api/rbac/roles` - List roles (requires `roles.read`)
- `POST /api/rbac/roles` - Create role (requires `roles.create`)
- `GET /api/rbac/users/:id` - Get user RBAC info (requires `users.manage`)

### Workspace Management
- `GET /api/tenants` - Get user's workspaces
- `POST /api/tenants` - Create new workspace

## 📁 Project Structure

```
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── contexts/          # React contexts (Auth, Tenant)
│   ├── pages/             # Page components
│   └── hooks/             # Custom React hooks
├── backend/               # Node.js API
│   ├── server.js         # Express server with API routes
│   ├── models/           # Database models
│   ├── services/         # Business logic services
│   └── middleware/       # Express middleware
├── database/             # Database setup and management
│   ├── init.sql         # Database schema
│   └── manage.js        # Database management CLI
├── tests/                # Test suites
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
└── docker-compose.yml    # Docker configuration
```

## 🔧 Environment Variables

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
```

## 🚀 Production Deployment

```bash
# Set up environment variables
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
echo "DB_PASSWORD=$(openssl rand -base64 16)" >> .env

# Deploy with Docker Compose
./docker-start.sh prod
```

## 📱 Usage Guide

1. **Login** with demo credentials or create new users
2. **Create Workspaces** via tenant selector or API
3. **Click Map** to create objects at specific locations
4. **Use Sidebar** to filter objects by type, tags, or time range
5. **Click Objects** to see enhanced tooltips with actions
6. **Access Admin Panel** via shield icon (requires admin permissions)
7. **Manage RBAC** through the admin interface at `/admin`

## 🔍 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `./docker-start.sh stop` |
| Database error | `./docker-start.sh health` |
| Can't create objects | Check `objects.create` permission |
| Authentication failed | Clear localStorage and re-login |
| Permission errors | Verify user roles with `/api/rbac/users/:id` |

## 📞 Support

1. Check logs: `./docker-start.sh logs`
2. Check health: `./docker-start.sh health`  
3. Reset app: `./docker-start.sh clean && ./docker-start.sh dev`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Run tests: `./docker-start.sh test`
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.