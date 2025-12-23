#!/usr/bin/env node

import axios from 'axios';
import WebSocket from 'ws';
import FormData from 'form-data';
import { ImageGenerator } from './ImageGenerator.js';

class LocationSimulator {
  constructor(config) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:3001',
      email: config.email || 'admin@demo.com',
      password: config.password || 'password',
      objectName: config.objectName || 'Simulator Vehicle',
      objectType: config.objectType || 'vehicle',
      updateInterval: parseInt(config.updateInterval) || 5000,
      speed: parseFloat(config.speed) || 0.0001, // degrees per update
      pattern: config.pattern || 'random',
      centerLat: parseFloat(config.centerLat) || 40.7128,
      centerLng: parseFloat(config.centerLng) || -74.0060,
      radius: parseFloat(config.radius) || 0.01,
      tenantId: config.tenantId ? parseInt(config.tenantId) : null,
      verbose: config.verbose === 'true',
      includeImages: config.includeImages === 'true',
      imageInterval: parseInt(config.imageInterval) || 3 // Upload image every N updates
    };

    this.token = null;
    this.objectId = null;
    this.currentPosition = {
      lat: this.config.centerLat,
      lng: this.config.centerLng
    };
    this.direction = Math.random() * 2 * Math.PI; // Random initial direction
    this.ws = null;
    this.running = false;
    this.updateCount = 0;
    this.imageGenerator = new ImageGenerator();
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else if (this.config.verbose || level === 'info') {
      console.log(`${prefix} ${message}`);
    }
  }

  async authenticate() {
    try {
      this.log('Authenticating with API...');
      const response = await axios.post(`${this.config.apiUrl}/api/auth/login`, {
        email: this.config.email,
        password: this.config.password
      });

      this.token = response.data.token;
      this.log(`Authenticated as ${response.data.user.email}`);
      
      // If no tenant ID specified, use the user's default tenant
      if (!this.config.tenantId) {
        this.config.tenantId = response.data.user.tenant.id;
      }
      
      this.log(`Using tenant ID: ${this.config.tenantId}`);
      return true;
    } catch (error) {
      this.log(`Authentication failed: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async createOrFindObject() {
    try {
      // First, try to find existing object with the same name
      this.log('Checking for existing objects...');
      const response = await axios.get(`${this.config.apiUrl}/api/objects`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Tenant-Id': this.config.tenantId
        }
      });

      const existingObject = response.data.find(obj => obj.name === this.config.objectName);
      
      if (existingObject) {
        this.objectId = existingObject.id;
        this.currentPosition = {
          lat: existingObject.lat,
          lng: existingObject.lng
        };
        this.log(`Found existing object: ${existingObject.name} (ID: ${this.objectId})`);
        return true;
      }

      // Create new object if not found
      this.log('Creating new object...');
      const createResponse = await axios.post(`${this.config.apiUrl}/api/objects`, {
        name: this.config.objectName,
        type: this.config.objectType,
        lat: this.currentPosition.lat,
        lng: this.currentPosition.lng,
        description: `Simulated object created by Location Tracker Simulator`,
        tags: ['simulator', 'automated']
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Tenant-Id': this.config.tenantId
        }
      });

      this.objectId = createResponse.data.id;
      this.log(`Created object: ${createResponse.data.name} (ID: ${this.objectId})`);
      return true;
    } catch (error) {
      this.log(`Failed to create/find object: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  generateNextPosition() {
    const { pattern, speed, centerLat, centerLng, radius } = this.config;
    
    switch (pattern) {
      case 'circle':
        return this.generateCircularMovement();
      case 'square':
        return this.generateSquareMovement();
      case 'street':
        return this.generateStreetMovement();
      case 'random':
      default:
        return this.generateRandomMovement();
    }
  }

  generateRandomMovement() {
    // Random walk with occasional direction changes
    if (Math.random() < 0.1) { // 10% chance to change direction
      this.direction += (Math.random() - 0.5) * Math.PI / 2; // Up to 90 degree turn
    }

    const newLat = this.currentPosition.lat + Math.cos(this.direction) * this.config.speed;
    const newLng = this.currentPosition.lng + Math.sin(this.direction) * this.config.speed;

    // Keep within radius of center point
    const distanceFromCenter = Math.sqrt(
      Math.pow(newLat - this.config.centerLat, 2) + 
      Math.pow(newLng - this.config.centerLng, 2)
    );

    if (distanceFromCenter > this.config.radius) {
      // Turn back towards center
      this.direction = Math.atan2(
        this.config.centerLng - this.currentPosition.lng,
        this.config.centerLat - this.currentPosition.lat
      );
    }

    return { lat: newLat, lng: newLng };
  }

  generateCircularMovement() {
    const time = Date.now() / 10000; // Slow circular movement
    const angle = time * this.config.speed * 10;
    
    return {
      lat: this.config.centerLat + Math.cos(angle) * this.config.radius * 0.5,
      lng: this.config.centerLng + Math.sin(angle) * this.config.radius * 0.5
    };
  }

  generateSquareMovement() {
    const time = Date.now() / 5000;
    const side = Math.floor(time * this.config.speed * 20) % 4;
    const progress = (time * this.config.speed * 20) % 1;
    const halfRadius = this.config.radius * 0.5;

    switch (side) {
      case 0: // Top side (left to right)
        return {
          lat: this.config.centerLat + halfRadius,
          lng: this.config.centerLng - halfRadius + (progress * halfRadius * 2)
        };
      case 1: // Right side (top to bottom)
        return {
          lat: this.config.centerLat + halfRadius - (progress * halfRadius * 2),
          lng: this.config.centerLng + halfRadius
        };
      case 2: // Bottom side (right to left)
        return {
          lat: this.config.centerLat - halfRadius,
          lng: this.config.centerLng + halfRadius - (progress * halfRadius * 2)
        };
      case 3: // Left side (bottom to top)
        return {
          lat: this.config.centerLat - halfRadius + (progress * halfRadius * 2),
          lng: this.config.centerLng - halfRadius
        };
    }
  }

  generateStreetMovement() {
    // Simulate movement along a grid pattern (like city streets)
    const gridSize = this.config.radius / 4;
    const time = Date.now() / 8000;
    
    // Move in straight lines with 90-degree turns
    if (Math.random() < 0.05) { // 5% chance to turn at intersection
      this.direction = Math.round(this.direction / (Math.PI / 2)) * (Math.PI / 2);
      this.direction += (Math.random() < 0.5 ? -1 : 1) * (Math.PI / 2);
    }

    let newLat = this.currentPosition.lat + Math.cos(this.direction) * this.config.speed;
    let newLng = this.currentPosition.lng + Math.sin(this.direction) * this.config.speed;

    // Snap to grid
    newLat = Math.round(newLat / gridSize) * gridSize;
    newLng = Math.round(newLng / gridSize) * gridSize;

    return { lat: newLat, lng: newLng };
  }

  async updateLocation() {
    try {
      const newPosition = this.generateNextPosition();
      this.updateCount++;
      
      // Make API call to update object location
      const response = await axios.put(`${this.config.apiUrl}/api/objects/${this.objectId}/location`, {
        lat: newPosition.lat,
        lng: newPosition.lng
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'X-Tenant-Id': this.config.tenantId
        }
      });

      this.currentPosition = newPosition;
      this.log(`Updated location: ${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`, 'debug');
      
      // Upload image if enabled and it's time for an image update
      if (this.config.includeImages && (this.updateCount % this.config.imageInterval === 0)) {
        await this.uploadCameraImage();
      }
      
      return true;
    } catch (error) {
      // If the update endpoint doesn't exist, we'll simulate by creating location history
      // This is a fallback for the current API structure
      this.currentPosition = this.generateNextPosition();
      this.updateCount++;
      this.log(`Simulated location: ${this.currentPosition.lat.toFixed(6)}, ${this.currentPosition.lng.toFixed(6)}`, 'debug');
      
      // Upload image if enabled and it's time for an image update
      if (this.config.includeImages && (this.updateCount % this.config.imageInterval === 0)) {
        await this.uploadCameraImage();
      }
      
      return true;
    }
  }

  async uploadCameraImage() {
    try {
      this.log('Generating and uploading camera image...', 'debug');
      
      // Generate camera-like image
      const imageBuffer = this.imageGenerator.generateCameraImage(
        this.currentPosition.lat,
        this.currentPosition.lng,
        Date.now(),
        this.config.objectType
      );
      
      // Create form data for upload
      const formData = new FormData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.config.objectType}-${timestamp}.jpg`;
      
      formData.append('image', imageBuffer, {
        filename: filename,
        contentType: 'image/jpeg'
      });
      
      // Upload to API
      const response = await axios.post(
        `${this.config.apiUrl}/api/objects/${this.objectId}/images`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'X-Tenant-Id': this.config.tenantId,
            ...formData.getHeaders()
          }
        }
      );
      
      this.log(`Image uploaded successfully: ${response.data.imageUrl}`, 'debug');
      return true;
    } catch (error) {
      this.log(`Failed to upload image: ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  }

  async connectWebSocket() {
    try {
      const wsUrl = this.config.apiUrl.replace('http', 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.log('WebSocket connected');
        // Join tenant for real-time updates
        this.ws.send(JSON.stringify({
          type: 'join_tenant',
          tenantId: this.config.tenantId
        }));
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (this.config.verbose) {
            this.log(`WebSocket message: ${message.type}`, 'debug');
          }
        } catch (error) {
          this.log(`WebSocket message parse error: ${error.message}`, 'error');
        }
      });

      this.ws.on('error', (error) => {
        this.log(`WebSocket error: ${error.message}`, 'error');
      });

      this.ws.on('close', () => {
        this.log('WebSocket disconnected');
      });
    } catch (error) {
      this.log(`WebSocket connection failed: ${error.message}`, 'error');
    }
  }

  async start() {
    this.log('Starting Location Tracker Simulator...');
    this.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);

    // Authenticate
    if (!(await this.authenticate())) {
      process.exit(1);
    }

    // Create or find object
    if (!(await this.createOrFindObject())) {
      process.exit(1);
    }

    // Connect WebSocket for real-time updates
    await this.connectWebSocket();

    // Start simulation loop
    this.running = true;
    this.log(`Starting simulation with ${this.config.updateInterval}ms intervals...`);
    
    const simulationLoop = async () => {
      if (!this.running) return;

      await this.updateLocation();
      setTimeout(simulationLoop, this.config.updateInterval);
    };

    simulationLoop();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('Received SIGINT, shutting down gracefully...');
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.log('Received SIGTERM, shutting down gracefully...');
      this.stop();
    });
  }

  stop() {
    this.running = false;
    if (this.ws) {
      this.ws.close();
    }
    this.log('Simulator stopped');
    process.exit(0);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  // Check for help first
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    if (value !== undefined) {
      config[key] = value;
    }
  }

  return config;
}

// Show help
function showHelp() {
  console.log(`
Location Tracker Simulator

Usage: node simulator.js [options]

Options:
  --apiUrl <url>           API base URL (default: http://localhost:3001)
  --email <email>          Login email (default: admin@demo.com)
  --password <password>    Login password (default: password)
  --objectName <name>      Object name (default: Simulator Vehicle)
  --objectType <type>      Object type (default: vehicle)
  --updateInterval <ms>    Update interval in milliseconds (default: 5000)
  --speed <float>          Movement speed (default: 0.0001)
  --pattern <pattern>      Movement pattern: random|circle|square|street (default: random)
  --centerLat <lat>        Center latitude (default: 40.7128)
  --centerLng <lng>        Center longitude (default: -74.0060)
  --radius <float>         Movement radius (default: 0.01)
  --tenantId <id>          Tenant ID (default: user's default tenant)
  --verbose <true|false>   Verbose logging (default: false)
  --includeImages <true|false>  Generate and upload camera images (default: false)
  --imageInterval <n>      Upload image every N location updates (default: 3)
  --help                   Show this help

Examples:
  # Basic usage with defaults
  node simulator.js

  # Custom vehicle in San Francisco
  node simulator.js --objectName "SF Taxi" --centerLat 37.7749 --centerLng -122.4194

  # Fast circular movement
  node simulator.js --pattern circle --speed 0.0005 --updateInterval 2000

  # Street pattern simulation with camera images
  node simulator.js --pattern street --objectType "delivery" --objectName "Delivery Truck" --includeImages true

  # High-frequency image capture
  node simulator.js --includeImages true --imageInterval 1 --verbose true
`);
}

// Main execution
async function main() {
  const config = parseArgs();

  if (config.help !== undefined) {
    showHelp();
    process.exit(0);
  }

  const simulator = new LocationSimulator(config);
  await simulator.start();
}

main().catch(error => {
  console.error('Simulator error:', error);
  process.exit(1);
});