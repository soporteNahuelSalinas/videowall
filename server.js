const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

app.use(fileUpload());
app.use(express.static('public'));

const adminPassword = 'adminanyway2025';
const connectedDevices = [];

const SYNC_INTERVAL = 5000; // 5 segundos
let syncIntervalId = setInterval(() => {
  const syncTimestamp = Date.now();
  io.emit('syncVideos', { 
    timestamp: syncTimestamp,
    referenceTime: syncTimestamp % (1000 * 60 * 60) // Tiempo de referencia en milisegundos (1 hora)
  });
}, SYNC_INTERVAL);

app.post('/uploadVideo/:type', (req, res) => {
  if (!req.files?.video) return res.status(400).json({ error: 'No se subió ningún video' });

  const type = req.params.type;
  const video = req.files.video;
  const index = req.body.index;

  const fileName = type === 'monitor'
    ? 'monitor.webm'
    : type === 'vertical'
    ? 'vertical.webm'
    : `${index}.webm`;

  const uploadPath = path.join(__dirname, 'public', 'videos', fileName);

  video.mv(uploadPath, (err) => {
    if (err) return res.status(500).json({ error: 'Error guardando el video' });
    io.emit('videoUpdated', { type, index, fileName });
    res.json({ success: true, fileName });
  });
});

io.on('connection', (socket) => {
  const ip = socket.handshake.address.replace('::ffff:', '');
  console.log(`Nueva conexión desde: ${ip}`);

  socket.on('checkAdminPassword', (password) => {
    if (password === adminPassword) {
      socket.emit('adminStatus', { isAdmin: true });
      console.log(`El usuario desde ${ip} ha ingresado como ADMINISTRADOR.`);
    } else {
      socket.emit('adminStatus', { isAdmin: false });
      console.log(`El usuario desde ${ip} ha ingresado como CLIENTE.`);
    }
  });

  socket.on('resetVideos', () => {
    io.emit('resetVideos');
  });

  socket.on('changeSyncInterval', (newInterval) => {
    if (newInterval >= 1000) {
      clearInterval(syncIntervalId);
      syncInterval = newInterval;
      syncIntervalId = setInterval(() => {
        io.emit('syncVideos', { timestamp: Date.now() });
      }, syncInterval);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${ip}`);
    const index = connectedDevices.indexOf(socket);
    if (index !== -1) connectedDevices.splice(index, 1);
  });

  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });
});

server.listen(3000, '0.0.0.0', () => console.log('Servidor en puerto 3000'));