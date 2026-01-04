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
    }

    processPacket(packet) {
        this.stats.totalPackets++;
        this.stats.totalBytes += packet.length;

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

    getStats() {
        // Sort top sources (top 5)
        const sortedSources = Object.entries(this.stats.topSources)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .reduce((obj, [key, val]) => {
                obj[key] = val;
                return obj;
            }, {});

        const durationSec = (Date.now() - this.stats.startTime) / 1000;
        const bandwidth = durationSec > 0 ? (this.stats.totalBytes / durationSec).toFixed(2) : 0;

        return {
            ...this.stats,
            topSources: sortedSources,
            topDomains: this.getTopDomains(),
            bandwidth: bandwidth // bytes per second
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
