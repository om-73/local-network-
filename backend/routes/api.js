const express = require('express');
const router = express.Router();
const tsharkService = require('../tsharkService');
const deviceScanner = require('../deviceScanner');
const statsService = require('../statsService');
const os = require('os');

// Helper to get network interfaces
router.get('/interfaces', (req, res) => {
    const interfaces = os.networkInterfaces();
    const list = Object.keys(interfaces).map(name => ({
        name,
        address: interfaces[name][0].address // Just 1st address for simplicity
    }));
    res.json(list);
});

// Control Capture
router.post('/start-capture', (req, res) => {
    const { interfaceName } = req.body;
    try {
        tsharkService.startCapture(interfaceName);
        res.json({ status: 'started', message: 'Capture started' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/stop-capture', (req, res) => {
    tsharkService.stopCapture();
    res.json({ status: 'stopped', message: 'Capture stopped' });
});

router.get('/status', (req, res) => {
    res.json({ isCapturing: tsharkService.isCapturing });
});

// Device Discovery
router.get('/devices', async (req, res) => {
    try {
        const devices = await deviceScanner.scan();
        res.json(devices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistics
router.get('/stats', (req, res) => {
    res.json(statsService.getStats());
});

// Export Stats to JSON
router.get('/export', (req, res) => {
    const stats = statsService.getStats();
    res.header("Content-Type", "application/json");
    res.attachment("capture_stats.json");
    res.send(JSON.stringify(stats, null, 2));
});

module.exports = router;
