# Simulator Integration Guide

This document explains how to integrate the Location Tracker Simulator with your existing project.

## Quick Integration

### 1. Add to Main Docker Compose

Add the simulator service to your main `docker-compose.yml`:

```yaml
services:
  # ... existing services (backend, frontend, database)
  
  # Location Simulator
  simulator:
    build: ./simulator
    command: >
      node src/simulator.js
      --apiUrl http://backend:3001
      --objectName "Demo Vehicle"
      --pattern street
      --updateInterval 5000
      --verbose true
    depends_on:
      - backend
    restart: unless-stopped
    profiles:
      - simulator  # Optional: use profile to control when it runs
```

### 2. Update Docker Start Script

Add simulator commands to your `docker-start.sh`:

```bash
# Add these functions to docker-start.sh

start_simulator() {
    echo "Starting location simulator..."
    docker-compose --profile simulator up -d simulator
}

stop_simulator() {
    echo "Stopping location simulator..."
    docker-compose stop simulator
}

# Add to the case statement:
case "$1" in
    # ... existing cases
    "simulator")
        start_simulator
        ;;
    "stop-simulator")
        stop_simulator
        ;;
esac
```

### 3. Usage Examples

```bash
# Start the main application with simulator
./docker-start.sh dev
./docker-start.sh simulator

# Or start everything including simulator
docker-compose --profile simulator up -d

# Run standalone simulator
cd simulator
./run-simulator.sh build
./run-simulator.sh nyc

# Multiple simulators
./run-simulator.sh multi
```

## Advanced Integration

### Environment Variables

Create `simulator/.env` for configuration:

```bash
# Simulator Configuration
API_URL=http://localhost:3001
LOGIN_EMAIL=admin@demo.com
LOGIN_PASSWORD=password
DEFAULT_OBJECT_TYPE=vehicle
DEFAULT_UPDATE_INTERVAL=5000
DEFAULT_SPEED=0.0001
VERBOSE_LOGGING=true
```

### Custom Movement Patterns

Extend the simulator with your own patterns by modifying `src/simulator.js`:

```javascript
// Add to generateNextPosition() method
case 'custom':
    return this.generateCustomMovement();

generateCustomMovement() {
    // Your custom movement logic here
    // Return { lat: newLat, lng: newLng }
}
```

### API Extensions

If you add new endpoints to your backend, update the simulator:

```javascript
// Example: Add support for custom object properties
async updateObjectProperties() {
    await axios.put(`${this.config.apiUrl}/api/objects/${this.objectId}`, {
        customFields: {
            speed: this.calculateSpeed(),
            heading: this.direction,
            lastUpdate: new Date().toISOString()
        }
    }, {
        headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-Tenant-Id': this.config.tenantId
        }
    });
}
```

## Testing Integration

### 1. Verify API Connectivity

```bash
# Test from simulator container
docker run --rm location-simulator \
    --apiUrl http://host.docker.internal:3001 \
    --help

# Check API health
curl http://localhost:3001/api/health
```

### 2. Test Authentication

```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@demo.com","password":"password"}'
```

### 3. Monitor WebSocket

```bash
# View simulator logs
docker logs -f simulator-container-name

# Check WebSocket connections in backend logs
docker logs -f backend-container-name
```

## Production Deployment

### 1. Security Considerations

- Use environment variables for credentials
- Implement rate limiting for simulator API calls
- Consider using service accounts for simulator authentication
- Monitor resource usage and set appropriate limits

### 2. Scaling

```yaml
# docker-compose.yml - Multiple simulator instances
services:
  simulator-fleet:
    build: ./simulator
    command: >
      node src/simulator.js
      --apiUrl http://backend:3001
      --objectName "Fleet Vehicle ${REPLICA_ID}"
      --pattern street
    deploy:
      replicas: 5
    environment:
      - REPLICA_ID={{.Task.Slot}}
```

### 3. Monitoring

Add health checks and monitoring:

```yaml
services:
  simulator:
    # ... other config
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if backend is accessible
   docker run --rm curlimages/curl curl http://host.docker.internal:3001/api/health
   ```

2. **Authentication Failed**
   ```bash
   # Verify credentials in database
   docker exec -it postgres-container psql -U tracker_user -d location_tracker
   SELECT email, role FROM users WHERE email = 'admin@demo.com';
   ```

3. **WebSocket Issues**
   ```bash
   # Check WebSocket endpoint
   wscat -c ws://localhost:3001
   ```

### Debug Mode

Run simulator with full debugging:

```bash
docker run --rm -it location-simulator \
    --verbose true \
    --updateInterval 10000  # Slower updates for debugging
```

## Contributing

To contribute to the simulator:

1. Fork the repository
2. Create a feature branch
3. Add your changes to `simulator/src/`
4. Test with `./run-simulator.sh build && ./run-simulator.sh run`
5. Update documentation
6. Submit a pull request

## Support

For issues with the simulator:

1. Check the logs: `./run-simulator.sh logs`
2. Verify API connectivity
3. Test with verbose logging enabled
4. Check the main project's troubleshooting guide