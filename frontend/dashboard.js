const socket = io(CONFIG.BACKEND_URL);

// DOM Elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const scanBtn = document.getElementById('scanBtn');
const exportBtn = document.getElementById('exportBtn');
const interfaceSelect = document.getElementById('interfaceSelect');
const tableBody = document.querySelector('#packetTable tbody');
const totalPacketsEl = document.getElementById('totalPackets'); // Might be missing if stats card removed?
// Checked index.html: Stats cards are still there in .dashboard-grid (I didn't remove them in the edit, only replaced .main-content). 
// Wait, I replaced .main-content. The stats cards were *outside* .main-content in the previous file?
// Let's check the view_file output from Step 18.
// The stats cards are in .dashboard-grid, which is *before* .main-content. So they are safe.

const packetDetailsEl = document.getElementById('packetDetails');
const filterInput = document.getElementById('filterInput');
const alertBanner = document.getElementById('alertBanner');
const deviceModal = document.getElementById('deviceModal');
const deviceList = document.getElementById('deviceList');

let isCapturing = false;
let packetCount = 0;
let lastStatsUpdate = 0;
let packetsCache = []; // Store packets to display details later
const MAX_PACKETS = 1000;
const HEX_BYTES_PER_LINE = 16;
let deviceHistory = {}; // Store visited URLs per device IP

// Initialize
fetchInterfaces();
fetchStats();

// Socket Listeners
socket.on('connect', () => {
    console.log('Connected to backend');
});

socket.on('status', (data) => {
    isCapturing = data.isCapturing;
    updateControls();

    if (data.isDemo) {
        showAlert('ℹ️ Demo Mode Active: Showing simulated traffic data.');
    }
});

socket.on('packet', (packet) => {
    if (!isCapturing) return;

    // Enhance packet with index
    packetCount++;
    packet.index = packetCount;

    // Cache packet
    if (packetsCache.length >= MAX_PACKETS) {
        packetsCache.shift(); // Remove oldest
    }
    packetsCache.push(packet);

    // Add to table
    addPacketToTable(packet);

    // Track URLs for device history
    if (packet.url && packet.srcIp) {
        if (!deviceHistory[packet.srcIp]) {
            deviceHistory[packet.srcIp] = new Set();
        }
        deviceHistory[packet.srcIp].add(packet.url);
    }

    // Update stats UI if elements exist
    if (totalPacketsEl) totalPacketsEl.innerText = packetCount;
});

socket.on('error', (err) => {
    let msg = err.message || 'Unknown error';
    if (msg.includes('Tshark not found')) {
        msg = '⚠️ Tshark (Wireshark) not found. Please install Wireshark to enable live traffic.';
    }
    showAlert(msg);
});

// Event Listeners
startBtn.addEventListener('click', async () => {
    // Clear table on start
    tableBody.innerHTML = '';
    packetsCache = [];
    tableBody.innerHTML = '';
    packetsCache = [];
    packetCount = 0;
    deviceHistory = {}; // Clear history on new capture start

    const iface = interfaceSelect.value;
    await fetch(`${CONFIG.BACKEND_URL}/api/start-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interfaceName: iface })
    });
});

stopBtn.addEventListener('click', async () => {
    await fetch(`${CONFIG.BACKEND_URL}/api/stop-capture`, { method: 'POST' });
});

scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    scanBtn.innerText = 'Scanning...';
    try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/devices`);
        if (!res.ok) throw new Error('Scan failed');
        const { devices, isSimulated } = await res.json();

        if (isSimulated) {
            showAlert('⚠️ Demo Mode: Showing Simulated Devices (Run locally for real scan)');
        }

        renderDevices(devices);
    } catch (e) {
        showAlert('Scan failed: ' + e.message);
    } finally {
        scanBtn.disabled = false;
        scanBtn.innerText = 'Scan Devices';
    }
});

// Event Listener for Clear History
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all device URL history?')) {
            deviceHistory = {};
            showAlert('Device history cleared.');
            closeDeviceModal(); // Close to reset view, user can scan again to see empty state
        }
    });
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target == deviceModal) {
        closeDeviceModal();
    }
}

function closeDeviceModal() {
    deviceModal.classList.add('hidden');
}
window.closeDeviceModal = closeDeviceModal; // Expose to global scope for HTML button

exportBtn.addEventListener('click', () => {
    window.location.href = `${CONFIG.BACKEND_URL}/api/export`;
});

// Helper Functions
async function fetchInterfaces() {
    try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/interfaces`);
        const list = await res.json();
        let en0Found = false;
        list.forEach(iface => {
            const opt = document.createElement('option');
            opt.value = iface.name;
            opt.innerText = `${iface.name} (${iface.address})`;
            interfaceSelect.appendChild(opt);
            if (iface.name === 'en0') en0Found = true;
        });

        // Auto-select Wi-Fi (en0) if available for better text experience
        if (en0Found) {
            interfaceSelect.value = 'en0';
        }
    } catch (e) {
        console.error('Failed to load interfaces', e);
    }
}

async function fetchStats() {
    try {
        const res = await fetch(`${CONFIG.BACKEND_URL}/api/stats`);
        const stats = await res.json();

        // Update stats if elements exist
        if (totalPacketsEl) totalPacketsEl.innerText = stats.totalPackets;
        const bandwidthEl = document.getElementById('bandwidth');
        if (bandwidthEl) bandwidthEl.innerText = stats.bandwidth + ' B/s';

        // Sync packet count if we joined late
        if (packetCount === 0 && stats.totalPackets > 0) {
            packetCount = stats.totalPackets;
        }

        if (typeof updateCharts === 'function') {
            updateCharts(stats);
        }
    } catch (e) { console.error(e); }
}

function updateControls() {
    startBtn.disabled = isCapturing;
    stopBtn.disabled = !isCapturing;
    interfaceSelect.disabled = isCapturing;

    const header = document.querySelector('header');
    if (isCapturing) {
        header.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
    } else {
        header.style.boxShadow = '';
    }
}

function addPacketToTable(packet) {
    // Filter check
    const filter = filterInput.value.toLowerCase();
    if (filter) {
        const text = `${packet.srcIp} ${packet.dstIp} ${packet.protocol} ${packet.url || ''}`.toLowerCase();
        if (!text.includes(filter)) return;
    }

    const row = document.createElement('tr');
    row.className = `proto-${packet.protocol}`;
    row.dataset.index = packet.index; // Store index for retrieval

    // Click Handler for Selection
    row.addEventListener('click', () => {
        // Deselect current
        const current = tableBody.querySelector('.selected');
        if (current) current.classList.remove('selected');

        // Select new
        row.classList.add('selected');
        renderPacketDetails(packet);
        renderPacketBytes(packet);
    });

    // Timestamp
    const date = new Date(packet.timestamp * 1000);
    const timeStr = date.toLocaleTimeString().split(' ')[0] + '.' + date.getMilliseconds();

    // Info Column Construction
    let info = '';
    if (packet.protocol === 'HTTP' || packet.protocol === 'HTTPS') {
        info = `${packet.method || 'GET'} ${packet.url || '/'}`;
    } else if (packet.protocol === 'DNS') {
        info = `Standard query ${packet.url || ''}`;
    } else if (packet.protocol === 'TCP') {
        info = `${packet.srcPort || '443'} → ${packet.dstPort || '55556'} [ACK] Seq=...`;
    } else {
        info = `Protocol ${packet.protocol} Data`;
    }

    // Fallback if we don't have ports in the mock/capture yet
    if (!info || info === 'undefined') info = packet.url || 'Application Data';

    row.innerHTML = `
        <td>${packet.index}</td>
        <td>${timeStr}</td>
        <td>${packet.srcIp}</td>
        <td>${packet.dstIp}</td>
        <td>${packet.protocol}</td>
        <td>${packet.length}</td>
        <td>${info}</td>
    `;

    // Limit table rows
    if (tableBody.children.length > MAX_PACKETS) {
        tableBody.removeChild(tableBody.lastChild); // Remove from bottom if appending to top? 
        // Wireshark appends to bottom usually, but auto-scrolls.
        // Let's stick to prepending for "Latest on top" for web convenience,
        // OR append and scrollToBottom for authentic feel.
        // Web Monitor usually does "Latest Top". Let's stick to "Latest Top" for now as it's easier to see without auto-scroll logic.
        // But Wireshark lists are chronological (Latest Bottom). 
        // Let's allow Prepend (Latest Top) for now.
    }
    tableBody.prepend(row);
}

function renderPacketDetails(packet) {
    packetDetailsEl.innerHTML = '';

    const tree = document.createElement('div');
    tree.className = 'tree-view';

    // Frame Node
    addTreeNode(tree, `Frame ${packet.index}: ${packet.length} bytes on wire`, [
        `Arrival Time: ${new Date(packet.timestamp * 1000).toLocaleString()}`,
        `Frame Number: ${packet.index}`,
        `Frame Length: ${packet.length} bytes`
    ]);

    // Ethernet Node
    addTreeNode(tree, `Ethernet II, Src: ${packet.srcMac || '00:00:00:00:00:00'}, Dst: ${packet.dstMac || '00:00:00:00:00:00'}`, [
        `Destination: ${packet.dstMac || '00:00:00:00:00:00'}`,
        `Source: ${packet.srcMac || '00:00:00:00:00:00'}`,
        `Type: IPv4 (0x0800)`
    ]);

    // IP Node
    addTreeNode(tree, `Internet Protocol Version 4, Src: ${packet.srcIp}, Dst: ${packet.dstIp}`, [
        `Version: 4`,
        `Header Length: 20 bytes`,
        `Protocol: ${packet.protocol === 'TCP' ? '6 (TCP)' : packet.protocol === 'UDP' ? '17 (UDP)' : 'Unknown'}`,
        `Source Address: ${packet.srcIp}`,
        `Destination Address: ${packet.dstIp}`
    ]);

    // Protocol Node
    const protoHeader = `${packet.protocol} Protocol`;
    const protoChildren = [
        `Source Port: ${Math.floor(Math.random() * 60000) + 1024} (Simulated)`,
        `Destination Port: ${packet.protocol === 'HTTP' ? 80 : 443} (Simulated)`,
        `Length: ${packet.length - 54}`
    ];

    if (packet.url) {
        protoChildren.push(`Info: ${packet.url}`);
    }

    addTreeNode(tree, protoHeader, protoChildren);

    packetDetailsEl.appendChild(tree);
}

function addTreeNode(parent, headerText, childrenData) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-header';
    header.innerHTML = `<span class="tree-arrow">▶</span> <span>${headerText}</span>`;

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';

    childrenData.forEach(childText => {
        const child = document.createElement('div');
        child.className = 'tree-node';
        child.style.marginLeft = '10px';
        child.innerText = childText;
        childrenContainer.appendChild(child);
    });

    header.addEventListener('click', () => {
        const arrow = header.querySelector('.tree-arrow');
        arrow.classList.toggle('expanded');
        childrenContainer.classList.toggle('expanded');
    });

    node.appendChild(header);
    node.appendChild(childrenContainer);
    parent.appendChild(node);
}

function showAlert(msg) {
    alertBanner.innerText = msg;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
        alertBanner.classList.add('hidden');
    }, 5000);
}

function renderDevices(devices) {
    deviceList.innerHTML = '';

    // Show the modal
    deviceModal.classList.remove('hidden');

    if (devices.length === 0) {
        deviceList.innerHTML = '<li class="empty-state">No devices found on local network.</li>';
        return;
    }

    devices.forEach(dev => {
        const li = document.createElement('li');

        // Get visited URLs
        const urls = deviceHistory[dev.ip] ? Array.from(deviceHistory[dev.ip]) : [];
        const uniqueUrls = urls.slice(0, 10); // Show top 10 unique
        const urlHtml = uniqueUrls.length > 0
            ? `<div class="device-urls"><strong>Visited:</strong> ${uniqueUrls.join(', ')}</div>`
            : '<div class="device-urls text-muted">No URLs captured yet</div>';

        li.innerHTML = `
            <div class="device-info-row">
                <span class="device-ip">${dev.name || dev.ip}</span>
                <span class="device-mac">${dev.mac}</span>
            </div>
            ${urlHtml}
        `;
        li.style.cursor = 'pointer';
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid rgba(255,255,255,0.1)';

        li.onclick = () => {
            // Filter by this IP
            filterInput.value = dev.ip;
            closeDeviceModal();
            showAlert(`Filtering for ${dev.ip}`);
        };
        deviceList.appendChild(li);
    });
}

function renderPacketBytes(packet) {
    const container = document.querySelector('.bytes-content');
    if (!packet.hexdump) {
        container.innerHTML = '<div class="placeholder-text">No hex data available</div>';
        return;
    }

    const hex = packet.hexdump;
    const len = hex.length;
    let html = '';

    for (let i = 0; i < len; i += 2 * HEX_BYTES_PER_LINE) {
        // Offset
        const offset = (i / 2).toString(16).padStart(4, '0').toUpperCase();

        // Hex Data
        let hexChunk = '';
        let asciiChunk = '';

        for (let j = 0; j < 2 * HEX_BYTES_PER_LINE; j += 2) {
            if (i + j < len) {
                const byteHex = hex.substr(i + j, 2);
                hexChunk += byteHex + ' ';

                const code = parseInt(byteHex, 16);
                // Printable ASCII range
                if (code >= 32 && code <= 126) {
                    asciiChunk += String.fromCharCode(code);
                } else {
                    asciiChunk += '.';
                }
            } else {
                hexChunk += '   ';
                asciiChunk += ' ';
            }
        }

        html += `<div class="byte-row">
            <span class="byte-offset">${offset}</span>
            <span class="byte-hex">${hexChunk}</span>
            <span class="byte-ascii">${asciiChunk}</span>
        </div>`;
    }

    container.innerHTML = html;
}
