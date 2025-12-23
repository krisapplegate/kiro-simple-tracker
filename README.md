# Location Tracker

Multi-tenant location tracking application with RBAC, real-time updates, camera image generation, and admin workspace management.

## ✨ Key Features

- **🏢 Multi-Tenant Architecture**: Complete workspace isolation with automatic RBAC
- **📍 Real-Time Tracking**: Live position updates with WebSocket integration  
- **🔐 Advanced RBAC**: 6 roles, 32 permissions across 6 resources
- **📸 Camera Images**: AI-generated realistic camera feeds with location/time context
- **🗺️ Interactive Maps**: Leaflet-based interface with custom markers and tooltips
- **👥 Admin Management**: System-wide workspace and object management for super admins
- **🚗 Location Simulator**: Docker-based tool for realistic movement simulation
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

```bash
# Clone and start
git clone <repository-url>
cd location-tracker
./docker-start.sh dev

# Apply database migrations (one-time)
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

## 📚 Documentation

### 🎯 Getting Started
- **[Setup Guide](docs/SETUP.md)** - Complete installation and configuration
- **[User Guide](docs/USER_GUIDE.md)** - How to use the application
- **[Quick Start](#-quick-start)** - Get running in 5 minutes

### 👨‍💼 Administration
- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Administrative features and management
- **[API Reference](docs/API_REFERENCE.md)** - Complete REST API documentation
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### 🛠️ Development
- **[Development Guide](DEVELOPMENT.md)** - Development workflows and architecture
- **[Testing Guide](SETUP_AND_TESTING.md)** - Running and writing tests
- **[Cleanup Guide](CLEANUP_GUIDE.md)** - Data management and cleanup

### 🔧 Tools & Utilities
- **[Simulator Guide](simulator/README.md)** - Location simulation tools
- **[Object Icons](OBJECT_TYPE_ICONS.md)** - Icon configurations and usage

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│  (PostgreSQL)   │
│   Port 3000     │    │   Port 3001     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     MinIO       │              │
         └──────────────►│  (File Storage) │◄─────────────┘
                        │   Port 9000     │
                        └─────────────────┘
```

## 🔐 RBAC System

### Permission Levels
- **Super Admin** (32 permissions): Full system access + workspace management
- **Admin** (31 permissions): Full workspace management
- **Manager** (16 permissions): Team and object oversight
- **Operator** (12 permissions): Object and type management  
- **User** (6 permissions): Basic object access
- **Viewer** (7 permissions): Read-only access

### Admin Panel Access
- **Regular Admins**: Manage users, roles, groups within workspace
- **Super Admins**: Additional "Workspaces" tab for system-wide management

## 🚗 Location Simulator

Docker-based tool for realistic movement simulation:

```bash
# Quick scenarios
./simulator/run-simulator.sh nyc        # NYC Taxi 🚕
./simulator/run-simulator.sh sf         # SF Delivery Truck 🚚
./simulator/run-simulator.sh drone      # Security Drone 🚁
./simulator/run-simulator.sh multi      # All simulators

# Custom configuration
docker run --rm location-simulator \
  --name "Custom Vehicle" --objectType "truck" \
  --pattern street --centerLat 37.7749 --centerLng -122.4194 \
  --images --imageInterval 3 --verbose
```

**Patterns**: random, circle, square, street | **Features**: Multi-tenant, real-time updates, camera images

## 🧪 Testing

```bash
# Complete test suite
./docker-start.sh test-setup  # One-time setup
./docker-start.sh test        # All tests (118+ tests)

# Individual suites  
./docker-start.sh test-unit      # Unit tests (70)
./docker-start.sh test-api       # API integration (50+)
./docker-start.sh test-ui        # UI tests (30+)
```

## 🐳 Docker Commands

```bash
./docker-start.sh dev      # Development mode
./docker-start.sh prod     # Production mode
./docker-start.sh test     # Run tests
./docker-start.sh health   # Check health
./docker-start.sh logs     # View logs
./docker-start.sh db       # Database shell
./docker-start.sh backup   # Backup database
./docker-start.sh clean    # Clean everything
```

## 🧹 Data Management

Clean tracking data while preserving users, tenants, and configurations:

```bash
# Preview what would be deleted (safe)
./scripts/cleanup-all-data.sh --dry-run

# Interactive cleanup with confirmation
./scripts/cleanup-all-data.sh

# Force cleanup without confirmation  
./scripts/cleanup-all-data.sh --force
```

**What gets cleaned**: Objects, location history, image records and files  
**What's preserved**: Users, tenants, object type configurations  

See [Cleanup Guide](CLEANUP_GUIDE.md) for detailed documentation.

## 🌐 Key API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT + permissions

### Objects  
- `GET /api/objects` - List objects (tenant-scoped)
- `POST /api/objects` - Create object
- `PUT /api/objects/:id/location` - Update location
- `POST /api/objects/:id/images` - Upload camera image

### Admin (Super Admin Only)
- `GET /api/admin/tenants` - All workspaces with stats
- `GET /api/admin/objects` - All objects across workspaces  
- `DELETE /api/admin/tenants/:id` - Delete workspace (cascades)

See [API Reference](docs/API_REFERENCE.md) for complete documentation.

## 🚀 Production Deployment

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

## 📊 System Stats

- **Frontend**: React 18, Vite, TailwindCSS, Leaflet
- **Backend**: Node.js, Express, PostgreSQL, WebSocket
- **Storage**: MinIO for camera images
- **Testing**: 118+ tests (unit, integration, UI)
- **RBAC**: 6 roles, 32 permissions, complete tenant isolation
- **Features**: Real-time updates, camera generation, admin management

## 🔍 Need Help?

- **[Setup Issues](docs/SETUP.md)** - Installation and configuration
- **[Usage Questions](docs/USER_GUIDE.md)** - How to use features
- **[Admin Tasks](docs/ADMIN_GUIDE.md)** - Administrative functions
- **[API Integration](docs/API_REFERENCE.md)** - Technical documentation
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common problems and solutions

---

**Complete Documentation**: See [docs/README.md](docs/README.md) for the full documentation index.