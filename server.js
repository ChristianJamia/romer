const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

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
app.use(express.static('public'));

// Serve dashboard at root
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Romer Smart Garden - Cloud</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,rgba(52,199,89,0.9),rgba(40,167,69,0.9)),url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect fill="%2387CEEB" width="1200" height="800"/><ellipse cx="600" cy="700" rx="800" ry="150" fill="%2334C759" opacity="0.8"/><circle cx="150" cy="150" r="60" fill="%23FFD700" opacity="0.9"/></svg>');background-size:cover;background-attachment:fixed;min-height:100vh;padding:20px}
.access-badge{position:fixed;top:20px;right:20px;background:rgba(103,126,234,0.95);padding:10px 20px;border-radius:20px;box-shadow:0 5px 15px rgba(0,0,0,0.3);font-size:12px;font-weight:600;color:white;z-index:1000;display:flex;align-items:center;gap:8px}
.cloud-dot{width:8px;height:8px;background:white;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.container{max-width:450px;margin:0 auto}
.header{background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-radius:25px;padding:25px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}
.brand-logo{display:flex;align-items:center;gap:12px}
.logo-icon{font-size:36px}
.brand-name{font-size:28px;font-weight:700;color:#28a745}
.status-badge{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
.status-badge.online{background:#28a745;color:white}
.status-badge.offline{background:#ff3b30;color:white}
.status-badge.connecting{background:#ff9500;color:white}
.status-dot{width:8px;height:8px;background:white;border-radius:50%;animation:pulse 2s infinite}
.connection-info{background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-radius:25px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-align:center;margin-bottom:20px}
.connection-info h3{color:#333;font-size:16px;margin-bottom:10px}
.connection-info p{color:#666;font-size:14px;line-height:1.6}
.connection-status{display:inline-block;padding:8px 16px;background:#28a745;color:white;border-radius:20px;font-size:12px;font-weight:600;margin-top:10px}
.connection-status.disconnected{background:#ff3b30}
.weather-info{display:flex;gap:15px;padding-top:15px;border-top:1px solid #e0e0e0}
.weather-item{display:flex;align-items:center;gap:8px;flex:1}
.weather-icon{font-size:24px}
.weather-data{display:flex;flex-direction:column}
.weather-label{font-size:11px;color:#999;text-transform:uppercase}
.weather-value{font-size:16px;font-weight:700;color:#333}
.sensors-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px}
.sensor-card{background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-align:center}
.sensor-icon{font-size:36px;margin-bottom:10px}
.sensor-label{font-size:12px;color:#666;margin-bottom:8px;text-transform:uppercase;font-weight:600}
.sensor-value{font-size:28px;font-weight:700;color:#28a745;margin-bottom:5px}
.sensor-status{font-size:11px;color:#999}
.controls-section{background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);border-radius:25px;padding:25px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.section-title{font-size:18px;font-weight:700;color:#333;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.control-item{display:flex;justify-content:space-between;align-items:center;padding:15px;background:#f8f9fa;border-radius:15px;margin-bottom:12px;cursor:pointer;transition:all 0.3s ease}
.control-item:hover{transform:translateX(5px);box-shadow:0 5px 15px rgba(0,0,0,0.1)}
.control-item.active{background:linear-gradient(135deg,#34c759,#28a745)}
.control-item.disabled{opacity:0.5;cursor:not-allowed}
.control-item.active .control-info,.control-item.active .control-label,.control-item.active .control-status,.control-item.active .control-pin{color:white}
.control-left{display:flex;align-items:center;gap:15px}
.control-icon{font-size:28px}
.control-info{display:flex;flex-direction:column}
.control-label{font-size:15px;font-weight:600;color:#333}
.control-status{font-size:12px;color:#999}
.control-pin{font-size:10px;color:#666;margin-top:2px}
.toggle-switch{width:50px;height:28px;background:#ddd;border-radius:14px;position:relative;transition:all 0.3s ease}
.control-item.active .toggle-switch{background:rgba(255,255,255,0.3)}
.toggle-switch::after{content:'';position:absolute;width:22px;height:22px;background:white;border-radius:50%;top:3px;left:3px;transition:all 0.3s ease;box-shadow:0 2px 5px rgba(0,0,0,0.2)}
.control-item.active .toggle-switch::after{left:25px}
</style></head><body>
<div class="access-badge"><div class="cloud-dot"></div>☁️ CLOUD ACCESS</div>
<div class="container">
<div class="connection-info"><h3>🌐 Remote Cloud Connection</h3>
<p>Controlling your garden from anywhere in the world!</p>
<span class="connection-status" id="wsStatus">Connecting...</span></div>
<div class="header"><div class="brand"><div class="brand-logo"><div class="logo-icon">🌿</div>
<div class="brand-name">ROMER</div></div>
<div class="status-badge connecting" id="statusBadge"><div class="status-dot"></div>
<span id="statusText">CONNECTING...</span></div></div>
<div class="weather-info"><div class="weather-item"><div class="weather-icon">🌡️</div>
<div class="weather-data"><div class="weather-label">Temp</div>
<div class="weather-value" id="temp">--°C</div></div></div>
<div class="weather-item"><div class="weather-icon">💧</div>
<div class="weather-data"><div class="weather-label">Humidity</div>
<div class="weather-value" id="humidity">--%</div></div></div>
<div class="weather-item"><div class="weather-icon">☀️</div>
<div class="weather-data"><div class="weather-label">Light</div>
<div class="weather-value" id="light">---</div></div></div></div></div>
<div class="sensors-grid">
<div class="sensor-card"><div class="sensor-icon">💧</div><div class="sensor-label">Soil Moisture</div>
<div class="sensor-value" id="moisture">--%</div><div class="sensor-status">Optimal</div></div>
<div class="sensor-card"><div class="sensor-icon">🌱</div><div class="sensor-label">NPK Level</div>
<div class="sensor-value" id="npk">--</div><div class="sensor-status">Nutrient Status</div></div>
<div class="sensor-card"><div class="sensor-icon">⚗️</div><div class="sensor-label">pH Level</div>
<div class="sensor-value" id="ph">--</div><div class="sensor-status">Good</div></div>
<div class="sensor-card"><div class="sensor-icon">🌊</div><div class="sensor-label">Water Tank</div>
<div class="sensor-value" id="tank">--%</div><div class="sensor-status">Full</div></div></div>
<div class="controls-section"><div class="section-title"><span>⚡</span><span>Control Center</span></div>
<div class="control-item disabled" id="pump" onclick="toggleControl('pump')">
<div class="control-left"><div class="control-icon">💧</div>
<div class="control-info"><div class="control-label">Water Pump</div>
<div class="control-status">Connecting...</div><div class="control-pin">GPIO 26</div></div></div>
<div class="toggle-switch"></div></div>
<div class="control-item disabled" id="lights" onclick="toggleControl('lights')">
<div class="control-left"><div class="control-icon">💡</div>
<div class="control-info"><div class="control-label">Grow Lights</div>
<div class="control-status">Connecting...</div><div class="control-pin">GPIO 25</div></div></div>
<div class="toggle-switch"></div></div>
<div class="control-item disabled" id="ventilation" onclick="toggleControl('ventilation')">
<div class="control-left"><div class="control-icon">🌀</div>
<div class="control-info"><div class="control-label">Ventilation</div>
<div class="control-status">Connecting...</div><div class="control-pin">GPIO 33</div></div></div>
<div class="toggle-switch"></div></div>
<div class="control-item disabled" id="mist" onclick="toggleControl('mist')">
<div class="control-left"><div class="control-icon">🌊</div>
<div class="control-info"><div class="control-label">Mist System</div>
<div class="control-status">Connecting...</div><div class="control-pin">GPIO 32</div></div></div>
<div class="toggle-switch"></div></div></div></div>
<script>
let ws;let deviceConnected=false;const DEVICE_ID='romer-001';
const WS_URL='wss://'+window.location.host+'/romer';
function connectWebSocket(){console.log('Connecting...');ws=new WebSocket(WS_URL);
ws.onopen=()=>{console.log('Connected!');document.getElementById('wsStatus').textContent='Connected to Cloud';
document.getElementById('wsStatus').className='connection-status';
ws.send(JSON.stringify({type:'clientRegister',clientID:'web-'+Date.now()}))};
ws.onmessage=(e)=>{try{const d=JSON.parse(e.data);console.log('RX:',d);
if(d.type==='deviceConnected'){deviceConnected=true;updateStatus(true)}
if(d.type==='deviceDisconnected'){deviceConnected=false;updateStatus(false)}
if(d.type==='stateUpdate'){updateUI(d)}
if(d.type==='clientRegistered'){if(d.devices&&d.devices.length>0){deviceConnected=true;updateStatus(true);
ws.send(JSON.stringify({type:'getState',deviceID:DEVICE_ID}))}}}catch(err){console.error(err)}};
ws.onerror=(err)=>{console.error(err);document.getElementById('wsStatus').textContent='Error';
document.getElementById('wsStatus').className='connection-status disconnected'};
ws.onclose=()=>{console.log('Closed');deviceConnected=false;updateStatus(false);
document.getElementById('wsStatus').textContent='Reconnecting...';
document.getElementById('wsStatus').className='connection-status disconnected';setTimeout(connectWebSocket,5000)}}
function updateStatus(c){const b=document.getElementById('statusBadge');
const t=document.getElementById('statusText');const ctrls=document.querySelectorAll('.control-item');
if(c){b.className='status-badge online';t.textContent='DEVICE ONLINE';
ctrls.forEach(x=>x.classList.remove('disabled'))}else{b.className='status-badge offline';
t.textContent='DEVICE OFFLINE';ctrls.forEach(x=>{x.classList.add('disabled');
x.querySelector('.control-status').textContent='Offline'})}}
function updateUI(d){if(d.relays){updateCard('pump',d.relays.pump);updateCard('lights',d.relays.lights);
updateCard('ventilation',d.relays.ventilation);updateCard('mist',d.relays.mist)}
if(d.sensors){document.getElementById('temp').textContent=d.sensors.temperature+'°C';
document.getElementById('humidity').textContent=d.sensors.humidity+'%';
document.getElementById('light').textContent=d.sensors.light;
document.getElementById('moisture').textContent=d.sensors.moisture+'%';
document.getElementById('ph').textContent=d.sensors.ph;
document.getElementById('tank').textContent=d.sensors.tank+'%';
document.getElementById('npk').textContent=d.sensors.npk}}
function updateCard(id,state){const c=document.getElementById(id);
const s=c.querySelector('.control-status');if(state){c.classList.add('active');s.textContent='ON'}
else{c.classList.remove('active');s.textContent='OFF'}}
function toggleControl(device){if(!deviceConnected||!ws||ws.readyState!==WebSocket.OPEN){alert('Device offline!');return}
const c=document.getElementById(device);const newState=!c.classList.contains('active');
ws.send(JSON.stringify({type:'control',deviceID:DEVICE_ID,device:device,state:newState}));
console.log('Sent:',device,'->',newState?'ON':'OFF')}
connectWebSocket()
</script></body></html>`);
});

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
