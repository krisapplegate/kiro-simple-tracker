# Location Tracker

A multi-tenant location tracking application built with React, Node.js, PostgreSQL, and Leaflet maps.

## Features

- **Real-time Location Tracking**: Track objects with live position updates
- **Multi-tenant Architecture**: Isolated data per tenant with role-based access control
- **Role-Based Access Control (RBAC)**: Comprehensive permission system with 6 roles and 32 granular permissions
- **RBAC Management Interface**: Complete frontend for managing users, roles, groups, and permissions
- **Interactive Map Interface**: Leaflet-based map with custom emoji markers and enhanced tooltips
- **Enhanced Map Tooltips**: Status display, object details, and action buttons directly on map popups
- **Filtering & Search**: Filter by object type, time range, tags, and proximity
- **Object Management**: Create, edit, and delete tracked objects with permission-based access
- **Dynamic Object Types**: Choose from existing types or create custom types with emoji icons and usage statistics
- **Location History**: View historical movement data for each object
- **User & Group Management**: Organize users into groups with role-based permissions
- **RBAC Administration Panel**: Complete UI for managing users, roles, groups, and permissions (accessible via /admin)
- **Permission-Based Actions**: Granular access control for all application resources
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: WebSocket integration for live data synchronization

## Tech Stack

### Frontend
- React 18 with Hooks
- React Router for navigation
- TanStack Query for data fetching and caching
- Leaflet & React-Leaflet for maps
- Tailwind CSS for styling
- Lucide React for icons
- Vite for build tooling

### Backend
- Node.js with Express
- PostgreSQL database with connection pooling
- JWT authentication with bcrypt password hashing
- Role-Based Access Control (RBAC) with 32 granular permissions
- WebSocket for real-time updates
- Database models for Users, Objects, Location History, Roles, and Permissions
- CORS enabled for cross-origin requests

### Database
- PostgreSQL 15 with optimized indexes
- Multi-tenant data isolation with RBAC
- Role-based permission system with groups
- Location history tracking
- JSON fields for flexible custom data
- Automated schema initialization and migrations

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose (recommended)
- PostgreSQL 15+ (if running without Docker)
- npm or yarn

### Quick Start with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd location-tracker
```

2. Start the application:
```bash
./docker-start.sh dev
```

This will start:
- Frontend development server on http://localhost:3000
- Backend API server on http://localhost:3001
- PostgreSQL database on port 5432

### Manual Installation (Without Docker)

1. Install dependencies:
```bash
npm install
```

2. Set up PostgreSQL database:
```bash
# Create database and user
createdb location_tracker
psql location_tracker < database/init.sql
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database configuration
```

4. Start the development servers:
```bash
npm run dev
```

### Demo Credentials & Roles
- **Super Admin**: `admin@demo.com` / `password` (Full system access)
- **Test Users**: Create additional users with different roles for testing

### Testing

The application includes comprehensive testing capabilities:

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

# Cleanup test environment
./docker-start.sh test-cleanup
```

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

### Default Role Hierarchy
1. **Super Administrator** - Full system access (32 permissions)
2. **Administrator** - Full management except system admin (31 permissions)  
3. **Manager** - Team and object oversight (16 permissions)
4. **Operator** - Object and type management (12 permissions)
5. **Viewer** - Read-only access (7 permissions)
6. **User** - Basic object access for own objects (6 permissions)

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── MapView.jsx    # Main map interface with enhanced tooltips
│   │   ├── Sidebar.jsx    # Filters and controls with real-time updates
│   │   ├── ObjectDrawer.jsx # Object details panel with edit/delete actions
│   │   ├── CreateObjectModal.jsx # Object creation with dynamic type selection
│   │   ├── Navbar.jsx     # Navigation and user menu with admin access
│   │   ├── ProtectedRoute.jsx # Authentication wrapper
│   │   └── admin/         # RBAC administration components
│   │       ├── UserManagement.jsx # User management with role assignment
│   │       ├── RoleManagement.jsx # Role creation and permission management
│   │       ├── GroupManagement.jsx # Group creation and user assignment
│   │       └── PermissionOverview.jsx # Permission viewing and analysis
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.jsx # Authentication state management
│   │   └── TenantContext.jsx # Multi-tenant state management
│   ├── pages/             # Page components
│   │   ├── LoginPage.jsx  # Authentication page
│   │   ├── DashboardPage.jsx # Main dashboard with map and sidebar
│   │   └── AdminPage.jsx  # RBAC administration interface
│   ├── hooks/             # Custom React hooks
│   │   └── useWebSocket.js # WebSocket connection management
│   └── ...
├── backend/               # Backend Node.js application
│   ├── server.js         # Express server with API routes and WebSocket
│   ├── database.js       # PostgreSQL connection and query helpers
│   ├── services/         # Business logic services
│   │   └── RBACService.js # Role-based access control service
│   ├── middleware/       # Express middleware
│   │   └── rbac.js       # RBAC permission checking middleware
│   └── models/           # Database models
│       ├── User.js       # User authentication and management
│       ├── TrackedObject.js # Object tracking with ownership
│       └── LocationHistory.js # Location history tracking
├── database/             # Database setup and management
│   ├── init.sql         # Database schema and initial data
│   ├── manage.js        # Database management CLI
│   ├── migrate_add_created_by.sql # Migration for object ownership
│   ├── migrate_add_object_type_configs.sql # Migration for emoji icons
│   ├── migrate_add_rbac.sql # Migration for RBAC system
│   └── scripts/         # Database migration scripts
├── docker-compose.yml    # Development Docker setup
├── docker-compose.prod.yml # Production Docker setup
├── docker-start.sh      # Docker management script
├── DOCKER.md           # Docker documentation
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/validate` - Validate JWT token

### Objects
- `GET /api/objects` - Get tracked objects (requires `objects.read` permission)
- `POST /api/objects` - Create new tracked object (requires `objects.create` permission)
- `PUT /api/objects/:id` - Update object (requires `objects.update` permission + ownership)
- `DELETE /api/objects/:id` - Delete object (requires `objects.delete` permission + ownership)
- `GET /api/objects/types` - Get existing object types with usage counts
- `GET /api/objects/tags` - Get existing tags with usage counts
- `GET /api/objects/:id/locations` - Get location history for object

### RBAC Management
- `GET /api/users` - List all users with roles (requires `users.manage`)
- `POST /api/users` - Create new user (requires `users.create`)
- `GET /api/rbac/roles` - List all roles with permissions (requires `roles.read`)
- `POST /api/rbac/roles` - Create new role (requires `roles.create`)
- `DELETE /api/rbac/roles/:id` - Delete role (requires `roles.delete`)
- `GET /api/rbac/permissions` - List all available permissions (requires `roles.read`)
- `GET /api/rbac/groups` - List all groups with members (requires `groups.read`)
- `POST /api/rbac/groups` - Create new group (requires `groups.create`)
- `POST /api/rbac/users/:id/roles` - Assign role to user (requires `users.manage`)
- `DELETE /api/rbac/users/:id/roles/:roleId` - Remove role from user (requires `users.manage`)
- `POST /api/rbac/groups/:id/users` - Add user to group (requires `groups.update`)
- `DELETE /api/rbac/groups/:id/users/:userId` - Remove user from group (requires `groups.update`)
- `GET /api/rbac/users/:id` - Get user permissions and roles (requires `users.manage`)

### Object Type Configurations
- `GET /api/object-type-configs` - Get emoji and color configurations (requires `types.read`)
- `POST /api/object-type-configs` - Create/update type configuration (requires `types.create`)
- `DELETE /api/object-type-configs/:typeName` - Delete type configuration (requires `types.delete`)

### WebSocket Events
- `location_update` - Real-time location updates
- `object_created` - New object notifications
- `object_deleted` - Object deletion notifications

## Configuration

### Environment Variables

#### Backend Configuration
- `JWT_SECRET` - Secret key for JWT token signing
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

#### Database Configuration
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: location_tracker)
- `DB_USER` - Database user (default: tracker_user)
- `DB_PASSWORD` - Database password

### Database Management

#### Using Docker Helper Script
```bash
# Access database shell
./docker-start.sh db

# Check application health
./docker-start.sh health

# Create database backup
./docker-start.sh backup

# Restore from backup
./docker-start.sh restore backup_20231212_143022.sql
```

#### Using Management CLI
```bash
# Show database statistics
node database/manage.js stats

# List all users
node database/manage.js listUsers

# Create new user
node database/manage.js createUser user@example.com password123 user 1

# List all objects
node database/manage.js listObjects
```

#### Direct Database Access
```bash
# Connect to database (Docker)
docker-compose exec database psql -U tracker_user -d location_tracker

# Connect to database (Local)
psql -h localhost -U tracker_user -d location_tracker
```

## Deployment

### Docker Production Deployment

1. **Set up environment variables:**
```bash
# Create .env file
echo "JWT_SECRET=your-very-secure-secret-key" > .env
echo "DB_PASSWORD=your-secure-database-password" >> .env
```

2. **Deploy with Docker Compose:**
```bash
# Start production environment
./docker-start.sh prod

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment

#### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the dist/ folder
# Set VITE_API_URL to your backend URL
```

#### Backend + Database (Railway/Render/DigitalOcean)
```bash
# Use docker-compose.prod.yml
# Set environment variables in your platform
# Ensure PostgreSQL service is available
```

#### Kubernetes
```yaml
# Example deployment files available in k8s/ directory
# Includes services for frontend, backend, and database
```

### Environment-Specific Configuration

#### Development
- Uses volume mounts for hot reload
- Exposes database port for debugging
- Includes development tools

#### Production
- Optimized builds with multi-stage Docker
- Nginx for frontend serving
- Security hardening
- Persistent data volumes

## Features Roadmap

### Completed ✅
- [x] PostgreSQL database integration with connection pooling
- [x] Docker containerization for development and production
- [x] Multi-tenant architecture with role-based permissions
- [x] Comprehensive RBAC system with 6 roles and 32 permissions
- [x] Real-time WebSocket updates for live synchronization
- [x] Location history tracking and visualization
- [x] Object ownership and permission-based deletion
- [x] Dynamic object type selection with emoji icons and usage statistics
- [x] Enhanced map tooltips with status and action buttons
- [x] Comprehensive object management (create, edit, delete)
- [x] Real-time sidebar updates and filtering
- [x] User and group management with role assignments
- [x] Permission-based API endpoint protection

### In Progress 🚧
- [ ] Advanced filtering (geofencing, custom date ranges)
- [ ] Bulk object import/export functionality
- [ ] Advanced analytics and reporting
- [ ] Audit logging for security and compliance

### Planned 📋
- [ ] Audit logging for security and compliance
- [ ] Email/SMS notifications for alerts
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] API rate limiting
- [ ] Advanced user management dashboard
- [ ] Custom permission creation

## Troubleshooting

### Can't Add Objects
1. Check application health: `./docker-start.sh health`
2. Verify all containers are running: `docker-compose ps`
3. Check browser console for errors
4. Verify you're logged in (token in localStorage)
5. Try clicking the map or the floating + button
6. Check network tab for failed API requests

### RBAC and Permission Issues
1. **Access denied errors**: Check user roles and permissions with `/api/rbac/users/:id`
2. **Can't see admin features**: Only users with appropriate permissions can access management features
3. **Object access denied**: Users can only modify objects they created unless they have `objects.manage` permission
4. **Type configuration errors**: Requires `types.create/update/delete` permissions
5. **User management restricted**: Only users with `users.manage` permission can modify other users

### Testing RBAC System
```bash
# Test different user roles
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password"}' | jq -r '.token')

# Check user permissions
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/auth/validate | jq '.permissions'

# List all roles
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/rbac/roles | jq

# Test permission-protected endpoint
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/objects | jq
```

### Database Issues
- **Connection errors**: Check if database container is running
- **Schema errors**: Run `./docker-start.sh migrate` to update schema
- **"created_by column does not exist"**: Run database migration with `./docker-start.sh migrate`
- **Permission errors**: Check database user permissions
- **Data not persisting**: Ensure volumes are properly mounted

### Common Issues
- **CORS errors**: Make sure backend is running and accessible
- **Authentication errors**: Clear localStorage and login again
- **Map not loading**: Check internet connection for tile loading
- **WebSocket not connecting**: Verify backend WebSocket server is running
- **Port conflicts**: Use `./docker-start.sh stop` to stop all containers

### Debug Commands
```bash
# Check container status
docker-compose ps

# View logs
./docker-start.sh logs

# Check application health
./docker-start.sh health

# Access database
./docker-start.sh db

# View database stats
node database/manage.js stats
```

### Performance Monitoring
- Backend health endpoint: `http://localhost:3001/api/health`
- Database connection status included in health check
- WebSocket connection status shown in UI

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.# Test trigger for CI
