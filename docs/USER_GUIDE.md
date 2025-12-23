# User Guide

Complete guide for using the Location Tracker application.

## 🚀 Getting Started

### First Login
1. Navigate to http://localhost:3000
2. Login with demo credentials: `admin@demo.com` / `password`
3. You'll be taken to the tenant selector if you have access to multiple workspaces

### Dashboard Overview
The main dashboard consists of:
- **Interactive Map**: Shows all tracked objects with real-time updates
- **Sidebar**: Filters and controls for objects, types, and time ranges
- **Object Drawer**: Detailed information when an object is selected
- **Navbar**: Navigation, tenant switching, and admin access

## 🗺️ Using the Map

### Creating Objects
1. **Click anywhere on the map** to create a new object at that location
2. Fill in the object details:
   - **Name**: Display name for the object
   - **Type**: Category (vehicle, drone, person, etc.)
   - **Description**: Optional details
3. Click **Create Object** to save

### Viewing Objects
- **Object Icons**: Each object shows as an emoji icon on the map
- **Click an object** to open the Object Drawer with details
- **Path Lines**: Blue lines show the movement history
- **Historical Dots**: Click dots on the path to see location-specific images

### Real-Time Updates
- Objects update automatically when simulators are running
- New positions appear instantly via WebSocket connections
- Camera images are generated and displayed in real-time

## 📱 Sidebar Features

### Object Filters
- **Search**: Find objects by name
- **Type Filter**: Show only specific object types
- **Tag Filter**: Filter by custom tags
- **Time Range**: Show objects active in a specific period

### Recent Images
- **Latest Photos**: Shows recent camera images from all objects
- **Click Images**: Select and zoom to the object that took the photo
- **Time Stamps**: See when each image was captured

### Object List
- **All Objects**: Complete list of objects in current workspace
- **Status Indicators**: Online/offline status
- **Quick Actions**: Edit, delete, or view details

## 🔐 User Roles & Permissions

### Permission Levels
| Role | Permissions | Can Do |
|------|-------------|---------|
| **Viewer** | Read-only | View objects, maps, images |
| **User** | Basic access | Create/edit own objects |
| **Operator** | Object management | Manage all objects and types |
| **Manager** | Team oversight | Manage users and objects |
| **Admin** | Workspace control | Full workspace management |
| **Super Admin** | System-wide | Manage all workspaces |

### Checking Your Permissions
1. Click your profile in the navbar
2. Select "Profile" to see your role and permissions
3. Admin users see additional "Admin Panel" option

## 👥 Multi-Tenant Workspaces

### Switching Workspaces
1. Click the workspace name in the navbar
2. Select from available workspaces
3. Data is completely isolated between workspaces

### Creating Workspaces
- Only available to users with appropriate permissions
- Each workspace has its own objects, users, and settings
- Workspace admins can manage their workspace independently

## 📸 Camera Images

### Viewing Images
- **Object Drawer**: Click "Images" tab to see all photos from an object
- **Map Popups**: Camera icon shows image count, click to view recent photos
- **Sidebar**: Recent images section shows latest photos across all objects
- **Historical View**: Click path dots to see location-specific images

### Image Features
- **Realistic Rendering**: AI-generated camera-like images
- **Time Context**: Day/night lighting based on timestamp
- **Location Context**: Urban/suburban scenes based on GPS coordinates
- **Camera Overlay**: Timestamp, coordinates, and object information

## 🔧 Settings & Configuration

### Object Types
- **Custom Icons**: Configure emoji icons for different object types
- **Colors**: Set custom colors for map display
- **Type Management**: Create, edit, or delete object types

### User Preferences
- **Map Settings**: Default zoom, center location
- **Display Options**: Show/hide various map elements
- **Notification Settings**: Real-time update preferences

## 🚗 Using Simulators

### Starting Simulators
Simulators create realistic movement and camera data for testing:

```bash
cd simulator

# Individual simulators
./run-simulator.sh nyc        # NYC Taxi 🚕
./run-simulator.sh sf         # SF Delivery 🚚
./run-simulator.sh drone      # Security Drone 🚁
./run-simulator.sh pedestrian # Walking Person 🚶

# All simulators at once
./run-simulator.sh multi
```

### Simulator Features
- **Realistic Movement**: Street-based navigation patterns
- **Camera Generation**: Automatic image capture at intervals
- **Multiple Patterns**: Random, circular, square, and street movement
- **Different Types**: Various object types with appropriate icons

## 🔍 Troubleshooting

### Common Issues

#### Can't See Objects
- Check if you're in the correct workspace
- Verify object filters aren't hiding objects
- Ensure you have read permissions for objects

#### Images Not Loading
- Check if MinIO service is running
- Verify image URLs are accessible
- Try refreshing the page

#### Permission Denied
- Contact your workspace administrator
- Check your role and permissions in profile
- Ensure you're in the correct workspace

#### Real-Time Updates Not Working
- Check WebSocket connection in browser dev tools
- Verify backend service is running
- Try refreshing the page to reconnect

### Getting Help
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review the [FAQ](FAQ.md)
3. Contact your system administrator
4. Check the [API Reference](API_REFERENCE.md) for technical details

## 📊 Advanced Features

### Bulk Operations (Admin)
- **Select Multiple Objects**: Use checkboxes in admin panel
- **Bulk Actions**: Delete multiple objects at once
- **Workspace Management**: View and manage all workspaces

### API Access
- **REST API**: Full programmatic access to all features
- **Authentication**: JWT token-based authentication
- **Documentation**: Complete API reference available

### Data Export
- **Object Data**: Export object information and location history
- **Image Archives**: Download camera images in bulk
- **Reports**: Generate usage and activity reports

---

**Next Steps**: 
- [Admin Guide](ADMIN_GUIDE.md) - Administrative features
- [API Reference](API_REFERENCE.md) - Technical documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions