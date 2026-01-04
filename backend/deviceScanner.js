const { exec } = require('child_process');
const dns = require('dns').promises;

class DeviceScanner {
    async scan() {
        return new Promise((resolve, reject) => {
            exec('arp -a', async (error, stdout, stderr) => {
                if (error) {
                    console.error('ARP scan error:', error);
                    return reject(error);
                }

                const devices = [];
                const lines = stdout.split('\n');
                const regex = /\((.*?)\) at (.*?) on/i;

                for (const line of lines) {
                    const match = line.match(regex);
                    if (match) {
                        const ip = match[1];
                        const mac = match[2];
                        let hostname = 'Unknown Device';

                        try {
                            // Try to resolve hostname
                            const names = await dns.reverse(ip);
                            if (names && names.length > 0) {
                                hostname = names[0];
                            }
                        } catch (e) {
                            // Common for local devices to not have reverse DNS entries
                            hostname = ip; // Fallback to IP as name
                        }

                        devices.push({
                            ip,
                            mac,
                            name: hostname,
                            lastSeen: Date.now()
                        });
                    }
                }

                resolve(devices);
            });
        });
    }
}

module.exports = new DeviceScanner();
