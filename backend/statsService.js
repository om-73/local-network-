class StatsService {
    constructor() {
        this.reset();
    }

    reset() {
        this.stats = {
            totalPackets: 0,
            totalBytes: 0,
            startTime: Date.now(),
            protocols: {},
            topSources: {},
            domains: {},
            deviceActivity: {} // Packets per IP
        };
        this.intervalBytes = 0;
        this.lastTickTime = Date.now();
        this.currentBandwidth = 0;
    }

    processPacket(packet) {
        this.stats.totalPackets++;
        this.stats.totalBytes += packet.length;
        this.intervalBytes += packet.length;

        // Protocol stats
        const proto = packet.protocol || 'Unknown';
        this.stats.protocols[proto] = (this.stats.protocols[proto] || 0) + 1;

        // Top sources & Device Activity
        const src = packet.srcIp;
        this.stats.topSources[src] = (this.stats.topSources[src] || 0) + 1;
        this.stats.deviceActivity[src] = (this.stats.deviceActivity[src] || 0) + 1;

        // Domain Stats
        if (packet.url && packet.url !== 'Unknown') {
            this.stats.domains[packet.url] = (this.stats.domains[packet.url] || 0) + 1;
        }
    }

    tick() {
        const now = Date.now();
        const durationSec = (now - this.lastTickTime) / 1000;
        if (durationSec > 0) {
            this.currentBandwidth = (this.intervalBytes / durationSec).toFixed(2);
        }
        this.intervalBytes = 0;
        this.lastTickTime = now;
        return this.currentBandwidth;
    }

    getStats() {
        // Sort top sources (top 5)
        const sortedSources = Object.entries(this.stats.topSources)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .reduce((obj, [key, val]) => {
                obj[key] = val;
                return obj;
            }, {});

        return {
            ...this.stats,
            topSources: sortedSources,
            topDomains: this.getTopDomains(),
            bandwidth: this.currentBandwidth // bytes per second in last tick
        };
    }

    getTopDomains() {
        return Object.entries(this.stats.domains || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10) // Top 10 domains
            .reduce((obj, [key, val]) => {
                obj[key] = val;
                return obj;
            }, {});
    }
}

module.exports = new StatsService();
