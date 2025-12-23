# Object Type Icon Configurations

This document lists the configured object type icons and colors for the Location Tracker application.

## Current Configurations

| Type | Icon | Color | Hex Code | Usage |
|------|------|-------|----------|-------|
| taxi | 🚕 | Yellow | #eab308 | NYC Taxi simulator |
| delivery | 🚚 | Orange | #f97316 | SF Delivery simulator |
| drone | 🚁 | Purple | #8b5cf6 | Security Drone simulator |
| person | 🚶 | Green | #10b981 | Pedestrian simulator |
| vehicle | 🚗 | Blue | #3b82f6 | General vehicles |
| asset | 🚲 | Rose | #f43f5e | Bicycles and assets |
| device | 📱 | Amber | #f59e0b | Mobile devices and sensors |

## Adding New Object Types

To add a new object type configuration, use the API endpoint:

```bash
curl -X POST http://localhost:3001/api/object-type-configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"typeName": "TYPE_NAME", "emoji": "EMOJI", "color": "#HEX_COLOR"}'
```

## Simulator Object Types

The simulator script provides predefined scenarios for different object types:

| Command | Object Type | Icon | Description | Location |
|---------|-------------|------|-------------|----------|
| `./run-simulator.sh nyc` | `taxi` | 🚕 | NYC Taxi | New York City |
| `./run-simulator.sh sf` | `delivery` | 🚚 | SF Delivery Truck | San Francisco |
| `./run-simulator.sh drone` | `drone` | 🚁 | Security Drone | NYC (Central Park area) |
| `./run-simulator.sh pedestrian` | `person` | 🚶 | Walking Pedestrian | NYC (Times Square area) |
| `./run-simulator.sh vehicle` | `vehicle` | 🚗 | General Vehicle | Los Angeles |
| `./run-simulator.sh asset` | `asset` | 🚲 | Bike Share Asset | Chicago |
| `./run-simulator.sh device` | `device` | 📱 | IoT Sensor Device | Seattle |
| `./run-simulator.sh multi` | All | All | Run all core simulators | Multiple cities |

### Movement Patterns
- **street**: Grid-based movement simulating city streets
- **circle**: Circular patrol pattern
- **random**: Random walk within defined radius

## Testing Individual Simulators

You can test each object type individually:

```bash
# Test taxi with yellow taxi icon 🚕
./run-simulator.sh nyc

# Test delivery truck with orange truck icon 🚚
./run-simulator.sh sf

# Test drone with purple helicopter icon 🚁
./run-simulator.sh drone

# Test pedestrian with green walking person icon 🚶
./run-simulator.sh pedestrian

# Test general vehicle with blue car icon 🚗
./run-simulator.sh vehicle

# Test asset tracking with rose bicycle icon 🚲
./run-simulator.sh asset

# Test IoT device with amber phone icon 📱
./run-simulator.sh device

# Run all core simulators together
./run-simulator.sh multi
```

## Icon Display

Icons are displayed on the map using the `createEmojiIcon` function in `MapView.jsx`. If no emoji configuration exists for a type, it falls back to a colored circle with the first letter of the type.

## Color Scheme

Colors are chosen to be visually distinct and semantically appropriate:
- Transportation: Blues, yellows, oranges
- People: Green
- Technology: Purple, amber
- Assets: Rose, red