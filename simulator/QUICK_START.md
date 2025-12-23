# Quick Start Guide

## Location Tracker Simulator

A self-contained Docker tool for simulating real-time object movement in your Location Tracker application.

### 🚀 Quick Setup

```bash
# 1. Build the simulator
cd simulator
./run-simulator.sh build

# 2. Test with help
docker run --rm location-simulator --help

# 3. Run basic simulation (will fail without backend running)
./run-simulator.sh run --verbose
```

### 🎯 Ready-to-Use Scenarios

```bash
# NYC Taxi (street pattern)
./run-simulator.sh nyc

# San Francisco Delivery Truck
./run-simulator.sh sf  

# Security Drone (circular patrol)
./run-simulator.sh drone

# Random Walking Pedestrian
./run-simulator.sh pedestrian

# All simulators at once
./run-simulator.sh multi
```

### 🔧 Custom Configuration

```bash
# Custom vehicle with specific parameters
docker run --rm location-simulator \
  --apiUrl http://localhost:3001 \
  --objectName "My Custom Vehicle" \
  --objectType "truck" \
  --pattern street \
  --centerLat 37.7749 \
  --centerLng -122.4194 \
  --speed 0.0002 \
  --updateInterval 3000 \
  --verbose true
```

### 🐳 Integration with Main Project

Add to your main `docker-compose.yml`:

```yaml
services:
  # ... your existing services
  
  simulator:
    build: ./simulator
    command: >
      --apiUrl http://backend:3001
      --objectName "Demo Vehicle"
      --pattern street
      --verbose true
    depends_on:
      - backend
    restart: unless-stopped
```

### 📊 Movement Patterns

- **`random`**: Natural unpredictable movement with boundaries
- **`circle`**: Smooth circular movement around center point  
- **`square`**: Rectangular path with 90-degree turns
- **`street`**: Grid-based movement simulating city streets

### 🛠️ Management Commands

```bash
./run-simulator.sh logs    # View logs from running simulators
./run-simulator.sh stop    # Stop all simulators
./run-simulator.sh clean   # Remove containers and images

# If you get "container name already in use" errors:
docker rm -f sim-nyc-taxi sim-sf-delivery sim-drone sim-pedestrian
```

### ✅ What It Does

1. **Authenticates** with your Location Tracker API
2. **Creates or finds** objects in your workspace
3. **Simulates realistic movement** using configurable patterns
4. **Broadcasts real-time updates** via WebSocket
5. **Respects multi-tenant isolation** 
6. **Handles graceful shutdown** with SIGINT/SIGTERM

### 🔍 Troubleshooting

**Connection Issues:**
```bash
# Test API connectivity
curl http://localhost:3001/api/health

# Check Docker networking
docker run --rm curlimages/curl curl http://host.docker.internal:3001/api/health
```

**Authentication Problems:**
- Verify credentials: `admin@demo.com` / `password` (default)
- Check if user exists in target workspace
- Ensure backend is running and accessible

**Build Issues:**
- Make sure you're in the `simulator/` directory
- Check Docker is running: `docker version`
- Rebuild: `./run-simulator.sh clean && ./run-simulator.sh build`

### 📝 Configuration Reference

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--apiUrl` | `http://localhost:3001` | Backend API URL |
| `--email` | `admin@demo.com` | Login email |
| `--password` | `password` | Login password |
| `--objectName` | `Simulator Vehicle` | Object name |
| `--objectType` | `vehicle` | Object type |
| `--updateInterval` | `5000` | Update interval (ms) |
| `--speed` | `0.0001` | Movement speed |
| `--pattern` | `random` | Movement pattern |
| `--centerLat` | `40.7128` | Center latitude |
| `--centerLng` | `-74.0060` | Center longitude |
| `--radius` | `0.01` | Movement radius |
| `--verbose` | `false` | Verbose logging |

The simulator is production-ready and perfect for testing, demos, or continuous fleet simulation!