const EventEmitter = require('events');
const deviceScanner = require('./deviceScanner');

class MockTsharkService extends EventEmitter {
    constructor() {
        super();
        this.isCapturing = false;
        this.interval = null;
        this.protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'ICMP', 'TLSv1.2'];
        this.ips = [
            '192.168.1.1', '192.168.1.45', '10.0.0.12', '8.8.8.8',
            '172.217.16.206', '157.240.241.35', '13.107.42.14'
        ];
        this.domains = [
            'google.com', 'facebook.com', 'youtube.com', 'amazon.com', 'netflix.com',
            'wikipedia.org', 'instagram.com', 'twitter.com', 'linkedin.com', 'microsoft.com',
            'apple.com', 'reddit.com', 'pinterest.com', 'twitch.tv', 'stackoverflow.com'
        ];
    }

    startCapture() {
        if (this.isCapturing) return;
        this.isCapturing = true;
        console.log('Starting Mock Traffic Capture (Demo Mode)...');
        this.emit('status', { status: 'running', isDemo: true });

        // Update IPs with real scanned devices for realistic simulation
        deviceScanner.scan().then(result => {
            const devices = result.devices || result; // Backward compatibility check just in case
            const scannedIps = devices.map(d => d.ip);
            if (scannedIps.length > 0) {
                // Combine scanned local IPs with some public internet IPs
                const publicIps = ['8.8.8.8', '1.1.1.1', '142.250.190.46', '13.107.42.14'];
                this.ips = [...scannedIps, ...publicIps];
            }
        }).catch(err => console.error('Error updating mock IPs:', err));

        this.interval = setInterval(() => {
            const packet = {
                timestamp: Date.now() / 1000,
                srcIp: this.ips[Math.floor(Math.random() * this.ips.length)],
                dstIp: this.ips[Math.floor(Math.random() * this.ips.length)],
                protocol: this.protocols[Math.floor(Math.random() * this.protocols.length)],
                length: Math.floor(Math.random() * 1500) + 40,
                srcMac: '00:00:00:00:00:00',
                dstMac: '00:00:00:00:00:00',
                url: Math.random() > 0.3 ? this.domains[Math.floor(Math.random() * this.domains.length)] : null,
                hexdump: this.generateRandomHex(Math.floor(Math.random() * 64) + 64) // 64-128 bytes of hex
            };
            this.emit('packet', packet);
        }, 300 + Math.random() * 500); // Send packet every 300-800ms
    }

    stopCapture() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isCapturing = false;
        this.emit('status', { status: 'stopped' });
        console.log('Mock Capture stopped');
    }

    generateRandomHex(length) {
        let result = '';
        const characters = '0123456789ABCDEF';
        for (let i = 0; i < length * 2; i++) {
            result += characters.charAt(Math.floor(Math.random() * 16));
        }
        return result;
    }
}

module.exports = new MockTsharkService();
