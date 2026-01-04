const { spawn, execSync } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');
const mockTshark = require('./mockTsharkService');

class TsharkService extends EventEmitter {
    constructor() {
        super();
        this.process = null;
        this.isCapturing = false;
        this.tsharkPath = this.findTshark();
        this.isDemoMode = false;

        // Forward mock events
        mockTshark.on('packet', (p) => this.emit('packet', p));
        mockTshark.on('status', (s) => {
            this.isCapturing = (s.status === 'running');
            this.emit('status', { isCapturing: this.isCapturing, ...s });
        });
        mockTshark.on('error', (e) => this.emit('error', e));
    }

    findTshark() {
        // 1. Try PATH
        try {
            execSync('which tshark');
            return 'tshark';
        } catch (e) {
            // Include specific ignored error handling if needed
        }

        // 2. Try Standard macOS Paths
        const commonPaths = [
            '/Applications/Wireshark.app/Contents/MacOS/tshark',
            '/usr/local/bin/tshark',
            '/opt/homebrew/bin/tshark'
        ];

        for (const p of commonPaths) {
            if (fs.existsSync(p)) {
                console.log(`Found tshark at: ${p}`);
                return p;
            }
        }

        console.error('Tshark not found in PATH or standard locations.');
        return null;
    }

    startCapture(interfaceName = '') {
        if (this.isCapturing) {
            console.log('Capture already running');
            return;
        }

        this.tsharkPath = this.findTshark();

        if (!this.tsharkPath) {
            console.log('Tshark not found. Starting in Demo Mode.');
            this.isDemoMode = true;
            mockTshark.startCapture();
            return;
        }

        this.isDemoMode = false;
        console.log(`Starting real capture with: ${this.tsharkPath}`);

        // Arguments for tshark:
        // -i: interface (optional, defaults to first available if empty)
        // -T ek: specific JSON format for easy parsing (or -T json)
        // -e: fields to extract
        // -l: flush stdout after each packet

        // We will use standard fields: frame.number, frame.time, ip.src, ip.dst, _ws.col.Protocol, frame.len
        // Note: -T fields with -E separator is often easier to stream-parse than JSON array which expects a closing bracket

        const args = [
            '-l', // flush output
            '-n', // no name resolution (faster)
            '-T', 'fields',
            '-E', 'separator=|',
            '-e', 'frame.time_epoch',
            '-e', 'ip.src',
            '-e', 'ip.dst',
            '-e', '_ws.col.Protocol',
            '-e', 'frame.len',
            '-e', 'eth.src', // MAC addresses for local LAN
            '-e', 'eth.dst',
            '-e', 'http.host',
            '-e', 'tls.handshake.extensions_server_name',
            '-e', 'dns.qry.name',
            '-e', 'frame' // Raw hex
        ];

        if (interfaceName) {
            args.unshift('-i', interfaceName);
        }

        try {
            this.process = spawn(this.tsharkPath, args);
            this.isCapturing = true;
            this.emit('status', { status: 'running', isDemo: false });

            this.process.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        this.parseLine(line);
                    }
                });
            });

            this.process.stderr.on('data', (data) => {
                const msg = data.toString();
                // tshark sends capture stats to stderr
                if (msg.includes('Permission denied') || msg.includes('you do not have permission')) {
                    console.error(`Tshark Permission Error: ${msg}`);
                    this.emit('error', { message: 'Permission denied. Please run server with sudo or install Wireshark ChmodBPF.' });
                    this.stopCapture(); // Ensure we clean up
                } else if (!msg.includes('packets captured') && !msg.includes('captured')) {
                    // Filter out some verbose stats/info
                    console.log(`Tshark Log: ${msg}`);
                }
            });

            this.process.on('close', (code) => {
                console.log(`Tshark process exited with code ${code}`);
                this.isCapturing = false;
                this.process = null;
                this.emit('status', { status: 'stopped', code });
            });

            this.process.on('error', (err) => {
                console.error('Failed to spawn tshark:', err);
                this.isCapturing = false;
                this.emit('error', err);
            });

        } catch (error) {
            console.error('Error starting tshark:', error);
            this.emit('error', error);
        }
    }

    stopCapture() {
        if (this.isDemoMode) {
            mockTshark.stopCapture();
        } else if (this.process) {
            this.process.kill();
        }
        this.isCapturing = false;
        this.process = null;
        this.emit('status', { status: 'stopped' });
        console.log('Capture stopped manually');
    }

    parseLine(line) {
        // Expected format based on args:
        // timestamp|src_ip|dst_ip|protocol|length|src_mac|dst_mac|http_host|sni|dns_query|frame_hex
        const parts = line.split('|');

        if (parts.length < 5) return;

        let url = null;
        if (parts[7] && parts[7].trim()) url = parts[7].trim(); // HTTP Host
        else if (parts[8] && parts[8].trim()) url = parts[8].trim(); // TLS SNI
        else if (parts[9] && parts[9].trim()) url = parts[9].trim(); // DNS Query

        const packet = {
            timestamp: parseFloat(parts[0]),
            srcIp: parts[1] || 'Unknown',
            dstIp: parts[2] || 'Unknown',
            protocol: parts[3] || 'TCP',
            length: parseInt(parts[4]) || 0,
            srcMac: parts[5] || '',
            dstMac: parts[6] || '',
            url: url,
            hexdump: parts[10] || '' // Raw hex string
        };

        this.emit('packet', packet);
    }
}

module.exports = new TsharkService();
