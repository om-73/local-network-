const { exec } = require('child_process');
const dns = require('dns').promises;

class DeviceScanner {
    async scan() {
        return new Promise(async (resolve, reject) => {
            // 0. Cloud Environment Check
            if (process.env.RENDER || process.env.VERCEL) {
                console.log('Cloud environment detected. Returning simulated devices.');
                return resolve({ devices: this.getSimulatedDevices(), isSimulated: true });
            }

            // 1. Perform Active Ping Sweep to populate ARP table (Local Only)
            try {
                await this.pingSweep();
            } catch (e) {
                console.error('Ping sweep failed:', e);
            }

            // 2. Read ARP Table
            exec('arp -a', async (error, stdout, stderr) => {
                const devices = [];

                // If error or empty output, fallback to simulation
                if (error || !stdout || stdout.length < 5) {
                    console.log('ARP Code failed or returned empty. Returning simulated devices for Demo Mode.');
                    return resolve({ devices: this.getSimulatedDevices(), isSimulated: true });
                }

                const lines = stdout.split('\n');
                // Regex for macOS/BSD: ? (192.168.0.1) at 50:2b:73:db:93:40 on en0
                // Regex for Windows: 192.168.1.1 00-11-22-33-44-55 dynamic
                // We'll try a flexible approach.
                const macRegex = /([0-9A-Fa-f]{1,2}[:-]){5}([0-9A-Fa-f]{1,2})/;
                const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;

                for (const line of lines) {
                    const ipMatch = line.match(ipRegex);
                    const macMatch = line.match(macRegex);

                    if (ipMatch && macMatch) {
                        const ip = ipMatch[0];
                        const mac = macMatch[0];

                        // Ignore multicast/broadcast
                        if (ip.startsWith('224.') || ip.endsWith('.255') || mac === 'ff:ff:ff:ff:ff:ff') continue;

                        let hostname = 'Unknown Device';
                        try {
                            const names = await dns.reverse(ip);
                            if (names && names.length > 0) hostname = names[0];
                        } catch (e) { hostname = ip; }

                        devices.push({ ip, mac, name: hostname, lastSeen: Date.now() });
                    }
                }

                if (devices.length === 0) {
                    return resolve({ devices: this.getSimulatedDevices(), isSimulated: true });
                }

                resolve({ devices, isSimulated: false });
            });
        });
    }

    async pingSweep() {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        let subnet = '';

        // Find local subnet (e.g., 192.168.1)
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    const parts = iface.address.split('.');
                    parts.pop(); // Remove last octet
                    subnet = parts.join('.');
                    break;
                }
            }
            if (subnet) break;
        }

        if (!subnet) return;

        console.log(`Scanning subnet: ${subnet}.1-254...`);
        const pings = [];
        // Scan a subset or full range? Full range 255 takes time.
        // Let's do a quick scan of common IPs first, or parallelize heavily.
        // We'll limit to 50 concurrent pings to avoid choking.

        for (let i = 1; i < 255; i++) {
            const ip = `${subnet}.${i}`;
            // Fire and forget - we just want to wake up ARP
            // Timeout 200ms
            const cmd = process.platform === 'win32'
                ? `ping -n 1 -w 200 ${ip}`
                : `ping -c 1 -W 200 ${ip}`; // standard ping -W is often ms on simple versions, or seconds. On Mac -W is ms. 

            // Async exec
            pings.push(new Promise(r => exec(cmd, () => r())));

            // Batching
            if (pings.length >= 50) {
                await Promise.all(pings);
                pings.length = 0;
            }
        }
        await Promise.all(pings);
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

module.exports = new DeviceScanner();
