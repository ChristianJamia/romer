const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const devices = new Map();
const clients = new Map();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    devices: devices.size,
    clients: clients.size,
    uptime: process.uptime()
  });
});

app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(devices.values()).map(d => ({
    deviceID: d.deviceID,
    name: d.name,
    connected: true,
    lastSeen: d.lastSeen
  }));
  res.json(deviceList);
});

wss.on('connection', (ws, req) => {
  console.log('New connection from:', req.socket.remoteAddress);
  
  let connectionType = null;
  let deviceID = null;
  let clientID = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      if (data.type === 'register' && data.deviceID) {
        connectionType = 'device';
        deviceID = data.deviceID;
        
        devices.set(deviceID, {
          ws: ws,
          deviceID: deviceID,
          name: data.name || 'Unknown Device',
          lastSeen: Date.now(),
          state: null
        });
        
        console.log(`Device registered: ${deviceID} (${data.name})`);
        
        ws.send(JSON.stringify({
          type: 'registered',
          deviceID: deviceID,
          message: 'Device registered successfully'
        }));
        
        broadcastToClients({
          type: 'deviceConnected',
          deviceID: deviceID,
          name: data.name
        });
      }
      else if (data.type === 'clientRegister') {
        connectionType = 'client';
        clientID = data.clientID || generateClientID();
        
        clients.set(clientID, {
          ws: ws,
          clientID: clientID,
          connectedAt: Date.now()
        });
        
        console.log(`Client registered: ${clientID}`);
        
        const deviceList = Array.from(devices.values()).map(d => ({
          deviceID: d.deviceID,
          name: d.name,
          state: d.state
        }));
        
        ws.send(JSON.stringify({
          type: 'clientRegistered',
          clientID: clientID,
          devices: deviceList
        }));
      }
      else if (data.type === 'state' && connectionType === 'device') {
        const device = devices.get(deviceID);
        if (device) {
          device.state = data;
          device.lastSeen = Date.now();
          
          console.log(`State update from ${deviceID}`);
          
          broadcastToClients({
            type: 'stateUpdate',
            deviceID: deviceID,
            ...data
          });
        }
      }
      else if (data.type === 'control' && connectionType === 'client') {
        const targetDeviceID = data.deviceID;
        const device = devices.get(targetDeviceID);
        
        if (device && device.ws.readyState === WebSocket.OPEN) {
          console.log(`Control command to ${targetDeviceID}: ${data.device} -> ${data.state}`);
          
          device.ws.send(JSON.stringify({
            type: 'control',
            device: data.device,
            state: data.state
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Device not connected'
          }));
        }
      }
      else if (data.type === 'getState' && connectionType === 'client') {
        const targetDeviceID = data.deviceID;
        const device = devices.get(targetDeviceID);
        
        if (device && device.ws.readyState === WebSocket.OPEN) {
          device.ws.send(JSON.stringify({
            type: 'getState'
          }));
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    if (connectionType === 'device' && deviceID) {
      console.log(`Device disconnected: ${deviceID}`);
      devices.delete(deviceID);
      
      broadcastToClients({
        type: 'deviceDisconnected',
        deviceID: deviceID
      });
    } else if (connectionType === 'client' && clientID) {
      console.log(`Client disconnected: ${clientID}`);
      clients.delete(clientID);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

function broadcastToClients(message) {
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
}

function generateClientID() {
  return 'client_' + Math.random().toString(36).substr(2, 9);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('========================================');
  console.log('  ROMER Cloud Server Started!');
  console.log('========================================');
  console.log(`  Port: ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log('========================================');
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});