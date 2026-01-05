const { exec } = require('child_process');
const dns = require('dns').promises;

class DeviceScanner {
    async scan() {
        return new Promise((resolve, reject) => {
            exec('arp -a', async (error, stdout, stderr) => {
                const devices = [];

                // If error (like on Render) or empty output, fallback to simulation
                if (error || !stdout || stdout.length < 5) {
                    console.log('ARP Code failed or returned empty. Returning simulated devices for Demo Mode.');
                    return resolve(this.getSimulatedDevices());
                }

                const lines = stdout.split('\n');
                const regex = /\((.*?)\) at (.*?) on/i;

                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        const ip = match[1];
                        const mac = match[2];
                        let hostname = 'Unknown Device';

                        try {
                            const names = await dns.reverse(ip);
                            if (names && names.length > 0) hostname = names[0];
                        } catch (e) { hostname = ip; }

                        devices.push({ ip, mac, name: hostname, lastSeen: Date.now() });
                    }
                }

                if (devices.length === 0) {
                    return resolve(this.getSimulatedDevices());
                }

                resolve(devices);
            });
        });
    }

    getSimulatedDevices() {
        return [
            { ip: '192.168.1.1', mac: '00:11:22:33:44:55', name: 'Gateway / Router', lastSeen: Date.now() },
            { ip: '192.168.1.45', mac: 'AA:BB:CC:DD:EE:FF', name: 'Smart TV', lastSeen: Date.now() },
            { ip: '10.0.0.12', mac: '12:34:56:78:90:AB', name: 'Work Laptop', lastSeen: Date.now() },
            { ip: '157.240.241.35', mac: 'Simulated', name: 'Facebook CDN', lastSeen: Date.now() },
            { ip: '172.217.16.206', mac: 'Simulated', name: 'Google Server', lastSeen: Date.now() }
        ];
    }
}
}

module.exports = new DeviceScanner();
