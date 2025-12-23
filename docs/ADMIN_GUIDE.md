# Admin Guide

Administrative features and management for Location Tracker.

## 🔐 Admin Access Levels

### Regular Admin
- **Scope**: Single workspace management
- **Access**: Admin panel with Users, Roles, Groups, Permissions tabs
- **Permissions**: Full control within assigned workspace

### Super Admin
- **Scope**: System-wide management
- **Access**: All admin features + Workspaces tab
- **Permissions**: Cross-workspace management and system administration

## 🏢 Workspace Management (Super Admin)

### Accessing Workspace Management
1. Login as super admin (`admin@demo.com`)
2. Click shield icon in navbar → Admin Panel
3. Navigate to "Workspaces" tab

### Workspace Overview
- **Hierarchical View**: Expandable workspace list with contained objects
- **Real-Time Statistics**: User count, object count, location history count
- **Bulk Operations**: Select multiple objects for batch actions
- **Cascading Deletion**: Workspace deletion removes ALL associated data

### Managing Workspaces
```bash
# API Examples for workspace management

# Get all workspaces with statistics
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/tenants

# Delete workspace (cascades to all data)
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/admin/tenants/2
```

### Workspace Features
- **Default Protection**: Workspace ID 1 cannot be deleted
- **Statistics Display**: Real-time counts of users, objects, and location records
- **Object Management**: View and delete objects across all workspaces
- **Bulk Selection**: Checkboxes for multi-object operations

## 👥 User Management

### Creating Users
1. Navigate to Admin Panel → Users tab
2. Click "Create User"
3. Fill in user details:
   - **Email**: Login identifier
   - **Password**: Initial password (user can change)
   - **Role**: Assign appropriate role
   - **Groups**: Optional group membership

### User Roles
| Role | Permissions | Use Case |
|------|-------------|----------|
| **Super Admin** | All 32 permissions | System administrators |
| **Admin** | 31 permissions | Workspace administrators |
| **Manager** | 16 permissions | Team leaders |
| **Operator** | 12 permissions | Object managers |
| **User** | 6 permissions | Regular users |
| **Viewer** | 7 permissions | Read-only access |

### Bulk User Operations
- **Import Users**: CSV upload for bulk user creation
- **Role Assignment**: Batch role changes
- **Group Management**: Add/remove users from groups
- **Deactivation**: Disable user accounts without deletion

## 🔑 Role & Permission Management

### Understanding RBAC
The system uses Role-Based Access Control (RBAC) with:
- **6 Resources**: objects, users, roles, groups, types, system
- **32 Permissions**: Granular control over actions
- **Hierarchical Roles**: Higher roles inherit lower role permissions

### Permission Matrix
```
Resource | Actions
---------|--------
objects  | read, create, update, delete, manage
users    | read, create, update, delete, manage
roles    | read, create, update, delete, manage
groups   | read, create, update, delete, manage
types    | read, create, update, delete, manage
icons    | read, create, update, delete, manage
system   | admin, audit
```

### Creating Custom Roles
1. Admin Panel → Roles tab
2. Click "Create Role"
3. Select permissions for each resource
4. Assign to users as needed

### Permission Inheritance
- **Cumulative**: Users can have multiple roles
- **Effective Permissions**: Union of all assigned role permissions
- **Group Permissions**: Inherited from group membership

## 📊 System Monitoring

### Dashboard Metrics
- **Active Users**: Currently logged in users
- **Object Count**: Total tracked objects across all workspaces
- **Real-Time Updates**: Live location update frequency
- **Storage Usage**: MinIO image storage consumption

### Activity Logs
- **User Actions**: Login, logout, object creation/modification
- **System Events**: Workspace creation, role changes
- **API Usage**: Endpoint access patterns and frequency
- **Error Tracking**: Failed operations and system errors

### Performance Monitoring
```bash
# Database performance
docker exec simple-tracker-database-1 psql -U tracker_user -d location_tracker \
  -c "SELECT * FROM pg_stat_activity;"

# Container resource usage
docker stats

# API health check
curl http://localhost:3001/api/health
```

## 🗄️ Data Management

### Database Administration
```bash
# Access database shell
./docker-start.sh db

# View table statistics
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;

# Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read 
FROM pg_stat_user_indexes;
```

### Backup & Restore
```bash
# Create backup
./docker-start.sh backup

# Restore from backup
docker exec -i simple-tracker-database-1 psql -U tracker_user -d location_tracker < backup.sql

# MinIO backup
docker exec simple-tracker-minio-1 mc mirror /data /backup/minio-data
```

### Data Cleanup
```bash
# Clean all tracking data (preserves users/tenants)
./scripts/cleanup-all-data.sh --dry-run  # Preview
./scripts/cleanup-all-data.sh --force    # Execute

# Options
--keep-images     # Preserve MinIO images
--stop-simulators # Stop simulators first
--dry-run         # Preview only
```

## 🔧 System Configuration

### Environment Variables
```bash
# Security
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PASSWORD=secure-password

# MinIO
MINIO_ACCESS_KEY=admin-key
MINIO_SECRET_KEY=admin-secret
```

### Feature Toggles
- **Real-Time Updates**: Enable/disable WebSocket connections
- **Image Generation**: Control camera image creation
- **Multi-Tenant**: Enable workspace isolation
- **RBAC**: Role-based access control

### Performance Tuning
```sql
-- Database optimization
CREATE INDEX CONCURRENTLY idx_objects_tenant_id ON objects(tenant_id);
CREATE INDEX CONCURRENTLY idx_location_history_object_id ON location_history(object_id);
CREATE INDEX CONCURRENTLY idx_images_tenant_id ON images(tenant_id);

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

## 🚨 Security Management

### Authentication Security
- **JWT Tokens**: Secure token-based authentication
- **Password Policies**: Enforce strong passwords
- **Session Management**: Automatic token expiration
- **Multi-Factor**: Optional 2FA integration

### Authorization Controls
- **Permission Validation**: Every API call checked
- **Tenant Isolation**: Complete data separation
- **Role Hierarchy**: Principle of least privilege
- **Audit Trail**: All actions logged

### Security Monitoring
```bash
# Failed login attempts
grep "Authentication failed" /var/log/location-tracker/app.log

# Permission violations
grep "Permission denied" /var/log/location-tracker/app.log

# Suspicious activity
grep "Unauthorized" /var/log/location-tracker/app.log
```

## 📈 Analytics & Reporting

### Usage Analytics
- **User Activity**: Login frequency, feature usage
- **Object Tracking**: Creation patterns, update frequency
- **API Usage**: Endpoint popularity, response times
- **Storage Growth**: Image storage trends

### Custom Reports
```sql
-- Most active users
SELECT u.email, COUNT(lh.id) as location_updates
FROM users u
JOIN objects o ON u.id = o.created_by
JOIN location_history lh ON o.id = lh.object_id
GROUP BY u.email
ORDER BY location_updates DESC;

-- Workspace statistics
SELECT t.name, 
       COUNT(DISTINCT u.id) as users,
       COUNT(DISTINCT o.id) as objects,
       COUNT(lh.id) as location_records
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
LEFT JOIN objects o ON t.id = o.tenant_id
LEFT JOIN location_history lh ON o.id = lh.object_id
GROUP BY t.id, t.name;
```

## 🔄 Maintenance Tasks

### Regular Maintenance
- **Database Vacuum**: Weekly VACUUM ANALYZE
- **Log Rotation**: Daily log file rotation
- **Image Cleanup**: Remove old images based on retention policy
- **Index Maintenance**: Monitor and rebuild indexes as needed

### Health Checks
```bash
# Application health
curl http://localhost:3001/api/health

# Database health
docker exec simple-tracker-database-1 pg_isready -U tracker_user

# MinIO health
curl http://localhost:9000/minio/health/live
```

### Troubleshooting
- **Performance Issues**: Check database queries, index usage
- **Memory Problems**: Monitor container resource usage
- **Storage Issues**: Clean up old images, check disk space
- **Network Problems**: Verify container connectivity

---

**Related Documentation**:
- [User Guide](USER_GUIDE.md) - End-user features
- [API Reference](API_REFERENCE.md) - Technical API documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions