const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const tsharkService = require('./tsharkService');
const statsService = require('./statsService');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { processOpts: { cors: { origin: "*" } } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api', apiRoutes);

// Socket.IO Handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial status
    socket.emit('status', { isCapturing: tsharkService.isCapturing });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Wire up TsharkService to Socket.IO and StatsService
tsharkService.on('packet', (packet) => {
    statsService.processPacket(packet);

    // Emit to all connected clients
    // To avoid overwhelming clients, we could throttle this or batch it, 
    // but for "real-time" feel and local usage, direct emit is fine for moderate traffic.
    io.emit('packet', packet);
});

tsharkService.on('status', (status) => {
    io.emit('status', { isCapturing: tsharkService.isCapturing, ...status });
});

tsharkService.on('error', (error) => {
    io.emit('error', { message: error.message });
});

// Start Server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Ensure you are running with admin privileges to capture packets.');
});
