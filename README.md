# Location Tracker

A multi-tenant location tracking application built with React, Node.js, PostgreSQL, and Leaflet maps.

## Features

- **Real-time Location Tracking**: Track objects with live position updates
- **Multi-tenant Architecture**: Isolated data per tenant with role-based access
- **Interactive Map Interface**: Leaflet-based map with custom markers and clustering
- **Filtering & Search**: Filter by object type, time range, tags, and proximity
- **Object Management**: Create, edit, and delete tracked objects
- **Location History**: View historical movement data for each object
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
- WebSocket for real-time updates
- Database models for Users, Objects, and Location History
- CORS enabled for cross-origin requests

### Database
- PostgreSQL 15 with optimized indexes
- Multi-tenant data isolation
- Location history tracking
- JSON fields for flexible custom data
- Automated schema initialization

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

### Demo Credentials
- Email: `admin@demo.com`
- Password: `password`

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   │   ├── MapView.jsx    # Main map interface
│   │   ├── Sidebar.jsx    # Filters and controls
│   │   ├── ObjectDrawer.jsx # Object details panel
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.jsx # Authentication state
│   │   └── TenantContext.jsx # Multi-tenant state
│   ├── pages/             # Page components
│   │   ├── LoginPage.jsx  # Authentication page
│   │   └── DashboardPage.jsx # Main dashboard
│   └── ...
├── backend/               # Backend Node.js application
│   ├── server.js         # Express server with API routes
│   ├── database.js       # PostgreSQL connection and query helpers
│   └── models/           # Database models
│       ├── User.js       # User authentication model
│       ├── TrackedObject.js # Object tracking model
│       └── LocationHistory.js # Location history model
├── database/             # Database setup and management
│   ├── init.sql         # Database schema and initial data
│   └── manage.js        # Database management CLI
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
- `GET /api/objects` - Get tracked objects (with filtering)
- `POST /api/objects` - Create new tracked object
- `DELETE /api/objects/:id` - Delete object (owner or admin only)
- `GET /api/objects/types` - Get existing object types with usage counts
- `GET /api/objects/tags` - Get existing tags with usage counts
- `GET /api/objects/:id/locations` - Get location history for object

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
- [x] PostgreSQL database integration
- [x] Docker containerization
- [x] Multi-tenant architecture
- [x] Real-time WebSocket updates
- [x] Location history tracking

### In Progress 🚧
- [ ] Advanced filtering (geofencing, custom date ranges)
- [ ] Bulk object import/export
- [ ] Advanced analytics and reporting

### Planned 📋
- [ ] Email/SMS notifications
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] API rate limiting
- [ ] Audit logging
- [ ] Advanced user management

## Troubleshooting

### Can't Add Objects
1. Check application health: `./docker-start.sh health`
2. Verify all containers are running: `docker-compose ps`
3. Check browser console for errors
4. Verify you're logged in (token in localStorage)
5. Try clicking the map or the floating + button
6. Check network tab for failed API requests

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

This project is licensed under the MIT License - see the LICENSE file for details.