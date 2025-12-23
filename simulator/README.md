# Location Tracker Simulator

A standalone Docker tool for simulating real-time object movement in the Location Tracker application. This simulator creates and moves objects on the map, providing realistic GPS coordinate updates through the backend API.

## Features

- **Multiple Movement Patterns**: Random walk, circular, square, and street-grid patterns
- **Configurable Parameters**: Speed, update intervals, center coordinates, and movement radius
- **Real-time Updates**: WebSocket integration for live position broadcasting
- **Multi-tenant Support**: Works with the application's tenant isolation system
- **Graceful Shutdown**: Handles SIGINT/SIGTERM for clean container stops

## Quick Start

### Using Docker

```bash
# Build the simulator image
docker build -t location-simulator .

# Run with default settings (connects to localhost:3001)
docker run --rm location-simulator

# Run with custom parameters
docker run --rm location-simulator \
  --apiUrl http://host.docker.internal:3001 \
  --objectName "Test Vehicle" \
  --pattern circle \
  --speed 0.0002 \
  --verbose true
```

### Using Docker Compose

Add this service to your `docker-compose.yml`:

```yaml
services:
  simulator:
    build: ./simulator
    command: >
      node src/simulator.js
      --apiUrl http://backend:3001
      --objectName "Demo Vehicle"
      --pattern street
      --updateInterval 3000
      --verbose true
    depends_on:
      - backend
    restart: unless-stopped
```

### Local Development

```bash
cd simulator
npm install
npm start

# Or with custom parameters
node src/simulator.js --objectName "Local Test" --pattern circle
```

## Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--apiUrl` | `http://localhost:3001` | Backend API base URL |
| `--email` | `admin@demo.com` | Login email for authentication |
| `--password` | `password` | Login password |
| `--objectName` | `Simulator Vehicle` | Name of the tracked object |
| `--objectType` | `vehicle` | Type of object (vehicle, person, asset, etc.) |
| `--updateInterval` | `5000` | Update interval in milliseconds |
| `--speed` | `0.0001` | Movement speed (degrees per update) |
| `--pattern` | `random` | Movement pattern (see below) |
| `--centerLat` | `40.7128` | Center latitude (NYC by default) |
| `--centerLng` | `-74.0060` | Center longitude (NYC by default) |
| `--radius` | `0.01` | Movement radius in degrees |
| `--tenantId` | `null` | Specific tenant ID (uses user's default if not set) |
| `--verbose` | `false` | Enable verbose logging |

## Movement Patterns

### Random Walk (`random`)
- Simulates natural, unpredictable movement
- Occasional direction changes with boundary constraints
- Good for pedestrian or general vehicle simulation

### Circular (`circle`)
- Smooth circular movement around the center point
- Consistent speed and radius
- Good for testing continuous tracking

### Square (`square`)
- Rectangular path with 90-degree turns
- Moves along the perimeter of a square
- Good for testing route-based tracking

### Street Grid (`street`)
- Simulates movement along city streets
- Grid-based with right-angle turns at intersections
- Most realistic for urban vehicle tracking

## Usage Examples

### Basic Simulation
```bash
# Simple vehicle moving randomly in NYC
docker run --rm location-simulator \
  --apiUrl http://localhost:3001 \
  --objectName "NYC Taxi"
```

### San Francisco Delivery Truck
```bash
# Delivery truck following street patterns in SF
docker run --rm location-simulator \
  --apiUrl http://localhost:3001 \
  --objectName "SF Delivery Truck" \
  --objectType "delivery" \
  --pattern street \
  --centerLat 37.7749 \
  --centerLng -122.4194 \
  --speed 0.0002 \
  --updateInterval 3000
```

### Fast Circular Drone
```bash
# Drone doing circular surveillance pattern
docker run --rm location-simulator \
  --apiUrl http://localhost:3001 \
  --objectName "Security Drone" \
  --objectType "drone" \
  --pattern circle \
  --speed 0.0005 \
  --updateInterval 1000 \
  --radius 0.005
```

### Multiple Simulators
```bash
# Run multiple simulators for different objects
docker run -d --name sim1 location-simulator \
  --objectName "Vehicle 1" --pattern random

docker run -d --name sim2 location-simulator \
  --objectName "Vehicle 2" --pattern circle

docker run -d --name sim3 location-simulator \
  --objectName "Vehicle 3" --pattern street
```

## Integration with Location Tracker

The simulator integrates seamlessly with the Location Tracker application:

1. **Authentication**: Uses the same login system as the web app
2. **Multi-tenant**: Respects workspace isolation
3. **Real-time Updates**: Broadcasts position changes via WebSocket
4. **Object Management**: Creates objects if they don't exist, or updates existing ones
5. **API Compatibility**: Uses the same REST endpoints as the frontend

## Docker Networking

When running with Docker Compose or in a Docker network:

```bash
# If backend is in the same Docker network
--apiUrl http://backend:3001

# If backend is on host machine (from container)
--apiUrl http://host.docker.internal:3001

# If backend is on a different host
--apiUrl http://192.168.1.100:3001
```

## Monitoring and Logs

Enable verbose logging to see detailed simulation activity:

```bash
docker run --rm location-simulator --verbose true
```

Log output includes:
- Authentication status
- Object creation/discovery
- WebSocket connection status
- Position updates (in verbose mode)
- Error messages and debugging info

## Troubleshooting

### Connection Issues
```bash
# Test API connectivity
curl http://localhost:3001/api/health

# Check if backend is accessible from container
docker run --rm curlimages/curl curl http://host.docker.internal:3001/api/health
```

### Authentication Problems
- Verify email/password credentials
- Check if the user exists in the target tenant
- Ensure the backend is running and accessible

### Object Creation Issues
- Verify user has `objects.create` permission
- Check tenant ID is correct
- Ensure database is properly initialized

## Development

### Building from Source
```bash
git clone <repository>
cd location-tracker/simulator
docker build -t location-simulator .
```

### Local Development
```bash
cd simulator
npm install
npm run dev  # Uses --watch for auto-restart
```

### Extending the Simulator
The simulator is designed to be easily extensible:

- Add new movement patterns in `generateNextPosition()`
- Modify authentication logic in `authenticate()`
- Add custom object properties in `createOrFindObject()`
- Implement additional API interactions as needed

## License

MIT License - see the main project LICENSE file for details.