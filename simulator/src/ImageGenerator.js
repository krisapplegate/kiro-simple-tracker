import { createCanvas } from 'canvas';

export class ImageGenerator {
  constructor() {
    this.width = 640;
    this.height = 480;
  }

  generateCameraImage(lat, lng, timestamp, objectType = 'vehicle') {
    try {
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');

      // Determine time of day based on timestamp
      const hour = new Date(timestamp).getHours();
      const isDay = hour >= 6 && hour < 18;
      const isDusk = (hour >= 17 && hour < 19) || (hour >= 5 && hour < 7);

      // Set background based on time of day
      this.drawBackground(ctx, isDay, isDusk);
      
      // Draw street scene
      this.drawStreet(ctx, isDay);
      
      // Draw buildings/environment
      this.drawEnvironment(ctx, lat, lng, isDay);
      
      // Add weather effects based on location and time
      this.addWeatherEffects(ctx, lat, lng, isDay);
      
      // Add camera overlay (timestamp, coordinates)
      this.addCameraOverlay(ctx, lat, lng, timestamp, objectType);
      
      // Add some noise/grain for realism
      this.addCameraGrain(ctx);

      return canvas.toBuffer('image/jpeg', { quality: 0.8 });
    } catch (error) {
      console.warn('Canvas not available, generating simple placeholder image');
      return this.generatePlaceholderImage(lat, lng, timestamp, objectType);
    }
  }

  generatePlaceholderImage(lat, lng, timestamp, objectType) {
    // Generate a simple text-based "image" as a fallback
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString();
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    // Create a simple SVG image
    const svgContent = `
      <svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
        <rect width="640" height="480" fill="#2c3e50"/>
        <rect x="20" y="20" width="600" height="440" fill="#34495e" stroke="#ecf0f1" stroke-width="2"/>
        
        <!-- Camera frame -->
        <rect x="40" y="40" width="560" height="400" fill="#1a252f" stroke="#3498db" stroke-width="1"/>
        
        <!-- Crosshair -->
        <line x1="300" y1="240" x2="340" y2="240" stroke="#e74c3c" stroke-width="2"/>
        <line x1="320" y1="220" x2="320" y2="260" stroke="#e74c3c" stroke-width="2"/>
        
        <!-- Info overlay -->
        <rect x="50" y="50" width="300" height="80" fill="rgba(0,0,0,0.8)"/>
        <text x="60" y="75" fill="#ecf0f1" font-family="monospace" font-size="14">${timeStr}</text>
        <text x="60" y="95" fill="#ecf0f1" font-family="monospace" font-size="14">GPS: ${coordStr}</text>
        <text x="60" y="115" fill="#ecf0f1" font-family="monospace" font-size="14">CAM: ${objectType.toUpperCase()}</text>
        
        <!-- Corner brackets -->
        <g stroke="#e74c3c" stroke-width="2" fill="none">
          <path d="M60,60 L60,80 L80,80"/>
          <path d="M560,60 L560,80 L540,80"/>
          <path d="M60,420 L60,400 L80,400"/>
          <path d="M560,420 L560,400 L540,400"/>
        </g>
        
        <!-- Simulated street scene -->
        <rect x="40" y="350" width="560" height="90" fill="#2c3e50"/>
        <rect x="40" y="350" width="560" height="10" fill="#f39c12"/>
        <line x1="40" y1="395" x2="600" y2="395" stroke="#f1c40f" stroke-width="2" stroke-dasharray="20,10"/>
        
        <!-- Buildings silhouette -->
        <rect x="100" y="200" width="60" height="150" fill="#34495e"/>
        <rect x="200" y="150" width="80" height="200" fill="#2c3e50"/>
        <rect x="320" y="180" width="70" height="170" fill="#34495e"/>
        <rect x="450" y="160" width="90" height="190" fill="#2c3e50"/>
        
        <!-- Windows -->
        <rect x="110" y="220" width="8" height="12" fill="#f39c12"/>
        <rect x="130" y="240" width="8" height="12" fill="#f39c12"/>
        <rect x="210" y="170" width="8" height="12" fill="#f39c12"/>
        <rect x="230" y="190" width="8" height="12" fill="#f39c12"/>
        <rect x="250" y="210" width="8" height="12" fill="#f39c12"/>
      </svg>
    `;
    
    return Buffer.from(svgContent, 'utf8');
  }

  drawBackground(ctx, isDay, isDusk) {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    
    if (isDay) {
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.7, '#E0F6FF'); // Light blue
      gradient.addColorStop(1, '#F0F8FF'); // Alice blue
    } else if (isDusk) {
      gradient.addColorStop(0, '#FF6B35'); // Orange
      gradient.addColorStop(0.5, '#F7931E'); // Amber
      gradient.addColorStop(1, '#FFD700'); // Gold
    } else {
      gradient.addColorStop(0, '#191970'); // Midnight blue
      gradient.addColorStop(0.7, '#000080'); // Navy
      gradient.addColorStop(1, '#2F2F2F'); // Dark gray
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStreet(ctx, isDay) {
    const streetY = this.height * 0.7;
    const streetHeight = this.height * 0.3;
    
    // Street surface
    ctx.fillStyle = isDay ? '#404040' : '#2A2A2A';
    ctx.fillRect(0, streetY, this.width, streetHeight);
    
    // Lane markings
    ctx.strokeStyle = isDay ? '#FFFF00' : '#CCCC00';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(0, streetY + streetHeight / 2);
    ctx.lineTo(this.width, streetY + streetHeight / 2);
    ctx.stroke();
    
    // Side lines
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, streetY);
    ctx.lineTo(this.width, streetY);
    ctx.stroke();
    
    // Sidewalk
    ctx.fillStyle = isDay ? '#C0C0C0' : '#808080';
    ctx.fillRect(0, streetY - 20, this.width, 20);
  }

  drawEnvironment(ctx, lat, lng, isDay) {
    // Determine environment type based on coordinates
    const isUrban = Math.abs(lat - 40.7128) < 1 && Math.abs(lng + 74.0060) < 1; // Near NYC
    const isSF = Math.abs(lat - 37.7749) < 1 && Math.abs(lng + 122.4194) < 1; // Near SF
    
    if (isUrban || isSF) {
      this.drawUrbanBuildings(ctx, isDay);
    } else {
      this.drawSuburbanScene(ctx, isDay);
    }
    
    // Add some random elements for variety
    this.addRandomElements(ctx, isDay);
  }

  drawUrbanBuildings(ctx, isDay) {
    const buildingColor = isDay ? '#696969' : '#2F2F2F';
    const windowColor = isDay ? '#4169E1' : '#FFD700';
    
    // Draw several buildings of different heights
    for (let i = 0; i < 6; i++) {
      const buildingWidth = 80 + Math.random() * 60;
      const buildingHeight = 100 + Math.random() * 200;
      const x = i * (this.width / 6) + Math.random() * 20;
      const y = this.height * 0.7 - buildingHeight;
      
      // Building
      ctx.fillStyle = buildingColor;
      ctx.fillRect(x, y, buildingWidth, buildingHeight);
      
      // Windows
      ctx.fillStyle = windowColor;
      for (let row = 0; row < Math.floor(buildingHeight / 25); row++) {
        for (let col = 0; col < Math.floor(buildingWidth / 15); col++) {
          if (Math.random() > 0.3) { // 70% chance of lit window
            const windowX = x + col * 15 + 5;
            const windowY = y + row * 25 + 10;
            ctx.fillRect(windowX, windowY, 8, 12);
          }
        }
      }
    }
  }

  drawSuburbanScene(ctx, isDay) {
    // Draw trees
    const treeColor = isDay ? '#228B22' : '#006400';
    const trunkColor = isDay ? '#8B4513' : '#654321';
    
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.width;
      const y = this.height * 0.5 + Math.random() * this.height * 0.2;
      
      // Tree trunk
      ctx.fillStyle = trunkColor;
      ctx.fillRect(x - 5, y, 10, 40);
      
      // Tree foliage
      ctx.fillStyle = treeColor;
      ctx.beginPath();
      ctx.arc(x, y - 10, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw houses
    for (let i = 0; i < 3; i++) {
      const x = i * (this.width / 3) + 50;
      const y = this.height * 0.6;
      
      // House
      ctx.fillStyle = isDay ? '#DEB887' : '#8B7355';
      ctx.fillRect(x, y, 60, 40);
      
      // Roof
      ctx.fillStyle = isDay ? '#8B0000' : '#5C0000';
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 30, y - 20);
      ctx.lineTo(x + 65, y);
      ctx.closePath();
      ctx.fill();
      
      // Door
      ctx.fillStyle = isDay ? '#654321' : '#4A2C17';
      ctx.fillRect(x + 25, y + 15, 10, 25);
      
      // Windows
      ctx.fillStyle = isDay ? '#87CEEB' : '#FFD700';
      ctx.fillRect(x + 10, y + 10, 8, 8);
      ctx.fillRect(x + 42, y + 10, 8, 8);
    }
  }

  addRandomElements(ctx, isDay) {
    // Add some cars parked on the street
    const carColors = ['#FF0000', '#0000FF', '#FFFFFF', '#000000', '#FFFF00'];
    
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * (this.width - 60);
      const y = this.height * 0.75;
      
      ctx.fillStyle = carColors[Math.floor(Math.random() * carColors.length)];
      ctx.fillRect(x, y, 50, 20);
      
      // Car windows
      ctx.fillStyle = isDay ? '#87CEEB' : '#2F2F2F';
      ctx.fillRect(x + 5, y + 2, 40, 8);
      
      // Wheels
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x + 10, y + 20, 5, 0, Math.PI * 2);
      ctx.arc(x + 40, y + 20, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  addWeatherEffects(ctx, lat, lng, isDay) {
    // Simple weather simulation based on location
    const weatherRandom = (lat * lng * 1000) % 100;
    
    if (weatherRandom > 80) {
      // Rain effect
      ctx.strokeStyle = isDay ? 'rgba(173, 216, 230, 0.6)' : 'rgba(173, 216, 230, 0.4)';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * this.width;
        const y = Math.random() * this.height;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 2, y + 10);
        ctx.stroke();
      }
    } else if (weatherRandom > 70) {
      // Fog effect
      ctx.fillStyle = isDay ? 'rgba(255, 255, 255, 0.3)' : 'rgba(128, 128, 128, 0.3)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  addCameraOverlay(ctx, lat, lng, timestamp, objectType) {
    // Camera timestamp and info overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 300, 80);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px monospace';
    
    const date = new Date(timestamp);
    const timeStr = date.toLocaleString();
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    ctx.fillText(`${timeStr}`, 20, 30);
    ctx.fillText(`GPS: ${coordStr}`, 20, 50);
    ctx.fillText(`CAM: ${objectType.toUpperCase()}`, 20, 70);
    
    // Camera crosshair in center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
    
    // Corner brackets
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    const corners = [
      [20, 20], [this.width - 20, 20], 
      [20, this.height - 20], [this.width - 20, this.height - 20]
    ];
    
    corners.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - 10);
      ctx.stroke();
    });
  }

  addCameraGrain(ctx) {
    // Add subtle noise for camera realism
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}